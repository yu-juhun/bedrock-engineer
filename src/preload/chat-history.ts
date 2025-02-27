import { ChatMessage } from '../types/chat/history'
import { SessionMetadata } from '../types/chat/history'
import { ChatSessionManager } from '../main/store/chatSession'
import { ConversationManager } from '../main/store/conversation'
import { createRuntimeClient } from '../main/api/bedrock/client'
import { store } from './store'

const chatSessionManager = new ChatSessionManager()

// 設定からAWS認証情報を取得
const awsConfig = store.get('aws')
if (!awsConfig?.accessKeyId || !awsConfig?.secretAccessKey) {
  console.warn('AWS credentials not found in store. Summary features will be disabled.')
}

const credentials = {
  region: awsConfig?.region || 'us-east-1',
  accessKeyId: awsConfig?.accessKeyId || '',
  secretAccessKey: awsConfig?.secretAccessKey || ''
}

// BedrockRuntimeClientインスタンスを作成して会話マネージャーを初期化
const runtimeClient = createRuntimeClient(credentials)
const conversationManager = new ConversationManager(runtimeClient)

// デバッグ用：初期化状態を確認
console.debug('Chat history initialized:', {
  hasCredentials: !!awsConfig?.accessKeyId && !!awsConfig?.secretAccessKey,
  region: credentials.region
})

export const chatHistory = {
  createSession(agentId: string, modelId: string, systemPrompt?: string) {
    return chatSessionManager.createSession(agentId, modelId, systemPrompt)
  },

  addMessage(sessionId: string, message: ChatMessage) {
    // メッセージを追加
    chatSessionManager.addMessage(sessionId, message)

    // 会話セッション取得
    const session = chatSessionManager.getSession(sessionId)
    if (session) {
      console.debug('Processing messages for session:', {
        sessionId,
        messageCount: session.messages.length,
        hasSystemPrompt: !!session.systemPrompt
      })

      // セッション内のメッセージを処理（要約などの処理を非同期で実行）
      void conversationManager
        .processSessionMessages(sessionId, session.messages, session.systemPrompt)
        .catch((error) => {
          console.error('Error processing session messages:', error)
        })
    } else {
      console.warn('Session not found:', sessionId)
    }

    return sessionId
  },

  getSession(sessionId: string) {
    return chatSessionManager.getSession(sessionId)
  },

  updateSessionTitle(sessionId: string, title: string) {
    return chatSessionManager.updateSessionTitle(sessionId, title)
  },

  deleteSession(sessionId: string) {
    // 関連する要約データも削除
    conversationManager.deleteSessionSummaries(sessionId)
    return chatSessionManager.deleteSession(sessionId)
  },

  deleteAllSessions() {
    // すべてのセッションの要約データを削除
    const allSessions = chatSessionManager.getAllSessionMetadata()
    for (const session of allSessions) {
      conversationManager.deleteSessionSummaries(session.id)
    }
    return chatSessionManager.deleteAllSessions()
  },

  getRecentSessions(): SessionMetadata[] {
    return chatSessionManager.getRecentSessions()
  },

  getAllSessionMetadata(): SessionMetadata[] {
    return chatSessionManager.getAllSessionMetadata()
  },

  setActiveSession(sessionId: string | undefined) {
    return chatSessionManager.setActiveSession(sessionId)
  },

  getActiveSessionId() {
    return chatSessionManager.getActiveSessionId()
  },

  updateMessageContent(sessionId: string, messageIndex: number, updatedMessage: ChatMessage) {
    return chatSessionManager.updateMessageContent(sessionId, messageIndex, updatedMessage)
  },

  deleteMessage(sessionId: string, messageIndex: number) {
    return chatSessionManager.deleteMessage(sessionId, messageIndex)
  },

  /**
   * トークン制限を考慮した最適化されたメッセージリストを生成
   * 長い会話履歴を要約して短くする
   * システムプロンプトは別で返し、messages配列にはsystemロールを含めない
   */
  getOptimizedMessages(sessionId: string) {
    const session = chatSessionManager.getSession(sessionId)
    if (!session) return { messages: [], systemPromptText: '', summarized: false }

    return conversationManager.generateModelMessages(
      sessionId,
      session.messages,
      session.systemPrompt
    )
  }
}
