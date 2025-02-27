import { ChatMessage, ChatSession } from '../chat/history'

export interface ChatHistoryAPI {
  createSession(agentId: string, modelId: string, systemPrompt?: string): string
  addMessage(sessionId: string, message: ChatMessage): void
  getSession(sessionId: string): ChatSession | null
  updateSessionTitle(sessionId: string, title: string): void
  deleteSession(sessionId: string): void
  getRecentSessions(): ChatSession[]
  getAllSessions(): ChatSession[]
  setActiveSession(sessionId: string | undefined): void
  getActiveSessionId(): string | undefined
  // トークン制限を考慮した最適化されたメッセージリストを取得する
  getOptimizedMessages(sessionId: string): {
    messages: any[]
    systemPromptText: string
    summarized: boolean
  }
}

// 他のAPIの型定義も同様に追加できます
export interface PreloadAPIs {
  chatHistory: ChatHistoryAPI
  // store: StoreAPI
  // file: FileAPI
  // tools: ToolsAPI
}
