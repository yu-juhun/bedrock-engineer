import { ChatMessage } from '../../../types/chat/history'

export interface MessageSummary {
  summaryText: string
  summaryTopics: string[]
  originalMessageIds: string[]
  createdAt: number
  messageCount: number
  tokenCount?: number
}

export interface ConversationContext {
  systemPrompt?: string
  summaries: MessageSummary[]
  recentMessages: ChatMessage[]
}

export interface SummarizeOptions {
  maxSummaryLength?: number
  preserveTopics?: number
}
