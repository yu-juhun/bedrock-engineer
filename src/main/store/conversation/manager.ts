import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime'
import { ChatMessage } from '../../../types/chat/history'
import { ConversationContext, MessageSummary } from './types'
import { MessageSummarizer } from './summarizer'
import { estimateObjectTokens, truncateToTokenLimit } from './tokenizer'
import path from 'path'
import fs from 'fs'
import { store } from '../../../preload/store'

export class ConversationManager {
  private summarizer: MessageSummarizer
  private summariesDir: string
  private readonly MAX_RECENT_MESSAGES = 10 // 常に保持する最新のメッセージ数
  private readonly SUMMARIZE_INTERVAL = 5 // この数のメッセージごとに要約を生成
  private readonly MAX_TOKEN_LIMIT = 64000 // 最大トークン数の目安 (Claude 200K のコンテキスト上限を想定)
  private readonly TOKEN_BUFFER = 10000 // 予備のトークンバッファ

  constructor(bedrockClient: BedrockRuntimeClient) {
    this.summarizer = new MessageSummarizer(bedrockClient)

    // 要約を保存するディレクトリを作成
    const userDataPath = store.get('userDataPath')
    if (!userDataPath) {
      throw new Error('userDataPath is not set in store')
    }

    this.summariesDir = path.join(userDataPath, 'conversation-summaries')
    fs.mkdirSync(this.summariesDir, { recursive: true })
  }

  /**
   * セッションのメッセージを処理し、必要に応じて要約を行う
   */
  async processSessionMessages(
    sessionId: string,
    messages: ChatMessage[],
    systemPrompt?: string
  ): Promise<void> {
    console.debug('Starting processSessionMessages:', {
      sessionId,
      messageCount: messages.length,
      hasSystemPrompt: !!systemPrompt
    })

    // 前回の要約情報を取得
    const lastSummaryInfo = this.getSessionSummaryInfo(sessionId)

    console.debug('Last summary info:', {
      sessionId,
      lastSummaryInfo
    })

    // 要約頻度に達したかチェック
    const shouldSummarize =
      !lastSummaryInfo.lastSummarizedAt ||
      messages.length - lastSummaryInfo.lastMessageCount >= this.SUMMARIZE_INTERVAL

    console.debug('Checking summarization conditions:', {
      sessionId,
      shouldSummarize,
      messageCount: messages.length,
      lastMessageCount: lastSummaryInfo.lastMessageCount,
      summarizeInterval: this.SUMMARIZE_INTERVAL,
      difference: messages.length - lastSummaryInfo.lastMessageCount
    })

    if (shouldSummarize) {
      // 未要約のメッセージを抽出
      const messagesToSummarize = messages.slice(
        lastSummaryInfo.lastMessageIndex,
        messages.length - this.MAX_RECENT_MESSAGES
      )

      console.debug('Messages to summarize:', {
        sessionId,
        messagesToSummarizeCount: messagesToSummarize.length,
        startIndex: lastSummaryInfo.lastMessageIndex,
        endIndex: messages.length - this.MAX_RECENT_MESSAGES
      })

      // 要約するメッセージがある場合のみ処理
      if (messagesToSummarize.length > 0) {
        try {
          // メッセージを要約
          const summary = await this.summarizer.summarizeMessages(messagesToSummarize)

          // 要約を保存
          this.saveMessageSummary(sessionId, summary)

          // セッションの要約情報を更新
          this.updateSessionSummaryInfo(sessionId, {
            lastSummarizedAt: Date.now(),
            lastMessageIndex: messages.length - this.MAX_RECENT_MESSAGES,
            lastMessageCount: messages.length
          })
        } catch (error) {
          console.error('Error summarizing messages for session', sessionId, error)
        }
      }
    }
  }

  /**
   * 会話コンテキストを構築する
   * トークン数上限を考慮し、システムプロンプト、要約、最近のメッセージを組み合わせる
   */
  buildConversationContext(
    sessionId: string,
    messages: ChatMessage[],
    systemPrompt?: string
  ): ConversationContext {
    // 最近のメッセージ（最新のMAX_RECENT_MESSAGES件）
    const recentMessages = messages.slice(-this.MAX_RECENT_MESSAGES)

    // 要約リストを取得
    const summaries = this.getSessionSummaries(sessionId)

    // まずは全て含めたコンテキストを作成
    const fullContext: ConversationContext = {
      systemPrompt,
      summaries,
      recentMessages
    }

    // トークン数を計算
    const totalTokens = this.estimateContextTokens(fullContext)

    // トークン数が制限内であれば、そのまま返す
    if (totalTokens <= this.MAX_TOKEN_LIMIT - this.TOKEN_BUFFER) {
      return fullContext
    }

    // トークン数が多すぎる場合は、要約を調整して削減
    return this.trimContextToTokenLimit(fullContext)
  }

  /**
   * コンテキストのトークン数を見積もる
   */
  private estimateContextTokens(context: ConversationContext): number {
    let totalTokens = 0

    // システムプロンプトのトークン数
    if (context.systemPrompt) {
      totalTokens += estimateObjectTokens(context.systemPrompt)
    }

    // 要約のトークン数
    context.summaries.forEach((summary) => {
      totalTokens += estimateObjectTokens(summary.summaryText)
      totalTokens += estimateObjectTokens(summary.summaryTopics)
    })

    // 最近のメッセージのトークン数
    context.recentMessages.forEach((message) => {
      totalTokens += estimateObjectTokens(message)
    })

    return totalTokens
  }

  /**
   * トークン制限に合わせてコンテキストを調整
   */
  private trimContextToTokenLimit(context: ConversationContext): ConversationContext {
    // システムプロンプトと最近のメッセージは必須として保持
    const trimmedContext: ConversationContext = {
      systemPrompt: context.systemPrompt,
      recentMessages: [...context.recentMessages],
      summaries: []
    }

    // 必須要素のトークン数を計算
    let usedTokens = 0
    if (context.systemPrompt) {
      usedTokens += estimateObjectTokens(context.systemPrompt)
    }
    context.recentMessages.forEach((message) => {
      usedTokens += estimateObjectTokens(message)
    })

    // 残りのトークン数を計算
    const remainingTokens = this.MAX_TOKEN_LIMIT - this.TOKEN_BUFFER - usedTokens

    // 要約を優先度順に追加（新しいものほど優先）
    const sortedSummaries = [...context.summaries].sort((a, b) => b.createdAt - a.createdAt)

    let currentTokens = 0
    for (const summary of sortedSummaries) {
      const summaryTokens =
        (summary.tokenCount || estimateObjectTokens(summary.summaryText)) +
        estimateObjectTokens(summary.summaryTopics)

      if (currentTokens + summaryTokens <= remainingTokens) {
        trimmedContext.summaries.push(summary)
        currentTokens += summaryTokens
      } else {
        // 最後の要約が入らない場合は、切り詰めて追加
        const truncatedSummary = { ...summary }
        const topicsTokens = estimateObjectTokens(summary.summaryTopics)
        const availableTextTokens = remainingTokens - currentTokens - topicsTokens

        if (availableTextTokens > 100) {
          // 最低100トークン以上あれば要約を入れる
          truncatedSummary.summaryText = truncateToTokenLimit(
            summary.summaryText,
            availableTextTokens
          )
          trimmedContext.summaries.push(truncatedSummary)
        }

        break // これ以上は入らないので終了
      }
    }

    return trimmedContext
  }

  /**
   * セッションの要約情報ファイルパスを取得
   */
  private getSessionSummaryInfoPath(sessionId: string): string {
    return path.join(this.summariesDir, `${sessionId}-info.json`)
  }

  /**
   * セッションの要約ファイルパスを取得
   */
  private getSessionSummaryPath(sessionId: string, timestamp: number): string {
    return path.join(this.summariesDir, `${sessionId}-${timestamp}.json`)
  }

  /**
   * セッションの要約情報を取得
   */
  private getSessionSummaryInfo(sessionId: string): {
    lastSummarizedAt: number
    lastMessageIndex: number
    lastMessageCount: number
    summaryFiles: string[]
  } {
    const infoPath = this.getSessionSummaryInfoPath(sessionId)

    try {
      if (fs.existsSync(infoPath)) {
        const infoData = fs.readFileSync(infoPath, 'utf-8')
        return JSON.parse(infoData)
      }
    } catch (error) {
      console.error('Error reading summary info:', error)
    }

    // デフォルト値を返す
    return {
      lastSummarizedAt: 0,
      lastMessageIndex: 0,
      lastMessageCount: 0,
      summaryFiles: []
    }
  }

  /**
   * セッションの要約情報を更新
   */
  private updateSessionSummaryInfo(
    sessionId: string,
    updates: Partial<{
      lastSummarizedAt: number
      lastMessageIndex: number
      lastMessageCount: number
    }>
  ): void {
    const infoPath = this.getSessionSummaryInfoPath(sessionId)
    const currentInfo = this.getSessionSummaryInfo(sessionId)

    const updatedInfo = {
      ...currentInfo,
      ...updates
    }

    try {
      fs.writeFileSync(infoPath, JSON.stringify(updatedInfo, null, 2))
    } catch (error) {
      console.error('Error updating summary info:', error)
    }
  }

  /**
   * メッセージ要約を保存
   */
  private saveMessageSummary(sessionId: string, summary: MessageSummary): void {
    try {
      // 要約ファイル名に使用するタイムスタンプ
      const timestamp = summary.createdAt
      const summaryPath = this.getSessionSummaryPath(sessionId, timestamp)

      // 要約をJSONとして保存
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2))

      // 要約情報にファイルを追加
      const info = this.getSessionSummaryInfo(sessionId)
      info.summaryFiles.push(path.basename(summaryPath))

      // 情報ファイルを更新
      const infoPath = this.getSessionSummaryInfoPath(sessionId)
      fs.writeFileSync(infoPath, JSON.stringify(info, null, 2))
    } catch (error) {
      console.error('Error saving message summary:', error)
    }
  }

  /**
   * セッションの全要約を取得
   */
  private getSessionSummaries(sessionId: string): MessageSummary[] {
    const info = this.getSessionSummaryInfo(sessionId)
    const summaries: MessageSummary[] = []

    for (const fileName of info.summaryFiles) {
      try {
        const filePath = path.join(this.summariesDir, fileName)
        if (fs.existsSync(filePath)) {
          const data = fs.readFileSync(filePath, 'utf-8')
          summaries.push(JSON.parse(data))
        }
      } catch (error) {
        console.error('Error reading summary file:', fileName, error)
      }
    }

    return summaries
  }

  /**
   * セッションの要約をすべて削除
   */
  deleteSessionSummaries(sessionId: string): void {
    const info = this.getSessionSummaryInfo(sessionId)

    // 要約ファイルの削除
    for (const fileName of info.summaryFiles) {
      try {
        const filePath = path.join(this.summariesDir, fileName)
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      } catch (error) {
        console.error('Error deleting summary file:', fileName, error)
      }
    }

    // 情報ファイルの削除
    const infoPath = this.getSessionSummaryInfoPath(sessionId)
    if (fs.existsSync(infoPath)) {
      fs.unlinkSync(infoPath)
    }
  }

  /**
   * モデル入力用のメッセージリストを生成する
   * 要約情報をシステムプロンプトに統合し、トークン制限内に収める
   * システムプロンプトとメッセージを分けて返す
   */
  generateModelMessages(
    sessionId: string,
    messages: ChatMessage[],
    systemPrompt?: string
  ): { messages: any[]; systemPromptText: string; summarized: boolean } {
    // コンテキストを構築
    const context = this.buildConversationContext(sessionId, messages, systemPrompt)

    // モデル用メッセージリストを初期化 (systemメッセージは含めない)
    const modelMessages: any[] = []

    // 要約があれば、システムプロンプトに組み込む
    let enhancedSystemPrompt = systemPrompt || ''
    let summarized = false

    if (context.summaries.length > 0) {
      summarized = true
      enhancedSystemPrompt += '\n\n## Summary of past conversations\n'

      // 要約を古い順に並べる
      const sortedSummaries = [...context.summaries].sort((a, b) => a.createdAt - b.createdAt)

      // 要約を組み込む
      sortedSummaries.forEach((summary, index) => {
        enhancedSystemPrompt += `\n### Summary ${index + 1}\n${summary.summaryText}\n`

        if (summary.summaryTopics.length > 0) {
          enhancedSystemPrompt += '\nImportant Topics:\n'
          summary.summaryTopics.forEach((topic) => {
            enhancedSystemPrompt += `- ${topic}\n`
          })
        }

        enhancedSystemPrompt += '\n'
      })
    }
    // デバッグ用のログは本番環境では削除
    if (process.env.NODE_ENV === 'development') {
      console.debug('Context built for session:', sessionId)
    }

    // 最近のメッセージを追加
    context.recentMessages.forEach((message) => {
      modelMessages.push(message)
    })

    // システムプロンプトとメッセージを分けて返す
    return {
      messages: modelMessages,
      systemPromptText: enhancedSystemPrompt,
      summarized
    }
  }
}
