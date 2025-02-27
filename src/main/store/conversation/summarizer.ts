import { ChatMessage } from '../../../types/chat/history'
import { MessageSummary, SummarizeOptions } from './types'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { estimateTokenCount } from './tokenizer'

/**
 * メッセージの要約を行うクラス
 */
export class MessageSummarizer {
  private client: BedrockRuntimeClient
  private defaultModel: string

  constructor(
    client: BedrockRuntimeClient,
    defaultModel = 'anthropic.claude-3-sonnet-20240229-v1:0'
  ) {
    this.client = client
    this.defaultModel = defaultModel
  }

  /**
   * AIを使って会話履歴を要約する
   */
  async summarizeMessages(
    messages: ChatMessage[],
    options: SummarizeOptions = {}
  ): Promise<MessageSummary> {
    if (messages.length === 0) {
      throw new Error('No messages to summarize')
    }

    // メッセージをテキスト形式に変換
    const messageTexts = messages
      .map((message) => {
        // コンテントブロックからテキストを抽出
        const textContent = message.content
          .filter((block) => 'text' in block)
          .map((block) => block.text)
          .join('\n')

        return `${message.role}: ${textContent}`
      })
      .join('\n\n')

    // 要約プロンプトの作成
    const prompt = this.createSummaryPrompt(messageTexts, options)

    try {
      // Claude 3を使用して要約を生成
      const response = await this.invokeModel(prompt)

      // レスポンスを解析して要約情報を構築
      const summary = this.parseSummaryResponse(response)

      // MessageSummaryオブジェクトを作成
      return {
        summaryText: summary.text,
        summaryTopics: summary.topics,
        originalMessageIds: messages.map((msg) => msg.id),
        createdAt: Date.now(),
        messageCount: messages.length,
        tokenCount: estimateTokenCount(summary.text)
      }
    } catch (error) {
      console.error('Error summarizing messages:', error)
      // エラー時はシンプルな要約を返す（AI要約に失敗した場合のフォールバック）
      return this.createFallbackSummary(messages)
    }
  }

  /**
   * 要約用のプロンプトを作成
   */
  private createSummaryPrompt(messageText: string, options: SummarizeOptions): string {
    const maxLength = options.maxSummaryLength || 300
    const topicsCount = options.preserveTopics || 5

    return `<messages>
${messageText}
</messages>

上記の会話を要約してください。以下の形式で出力してください：

<summary>
[ここに${maxLength}文字以内の会話の要約を書いてください。重要な情報、決定事項、ユーザーの要件を含めてください]
</summary>

<topics>
[ここに会話から抽出した重要なトピックやキーポイントを${topicsCount}つまでリストアップしてください。各トピックは1行に1つ]
</topics>`
  }

  /**
   * モデル呼び出しを実行
   */
  private async invokeModel(prompt: string): Promise<string> {
    try {
      const command = new InvokeModelCommand({
        modelId: this.defaultModel,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt
                }
              ]
            }
          ]
        })
      })

      const response = await this.client.send(command)
      const responseBody = JSON.parse(new TextDecoder().decode(response.body))

      return responseBody.content[0].text
    } catch (error) {
      console.error('Error invoking AI model:', error)
      throw error
    }
  }

  /**
   * AIのレスポンスから要約情報を抽出
   */
  private parseSummaryResponse(response: string): { text: string; topics: string[] } {
    try {
      // 要約テキストの抽出
      const summaryMatch = response.match(/<summary>([\s\S]*?)<\/summary>/i)
      const summaryText = summaryMatch ? summaryMatch[1].trim() : ''

      // トピックリストの抽出
      const topicsMatch = response.match(/<topics>([\s\S]*?)<\/topics>/i)
      const topicsText = topicsMatch ? topicsMatch[1].trim() : ''

      // トピックを行ごとに分割してリストに
      const topics = topicsText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)

      return {
        text: summaryText,
        topics
      }
    } catch (error) {
      console.error('Error parsing summary response:', error)
      return {
        text: response.substring(0, 300),
        topics: []
      }
    }
  }

  /**
   * AI要約に失敗した場合のフォールバック要約を作成
   */
  private createFallbackSummary(messages: ChatMessage[]): MessageSummary {
    // 簡易的な要約を作成（最初のユーザーメッセージを使用）
    const firstUserMsg = messages.find((msg) => msg.role === 'user')

    let summaryText = '会話の要約を生成できませんでした。'

    if (firstUserMsg) {
      const firstContent = firstUserMsg.content
        .filter((block) => 'text' in block)
        .map((block) => block.text)
        .join(' ')

      summaryText = `会話は「${firstContent.substring(0, 100)}」についてのものです。`
    }

    return {
      summaryText,
      summaryTopics: [],
      originalMessageIds: messages.map((msg) => msg.id),
      createdAt: Date.now(),
      messageCount: messages.length
    }
  }
}
