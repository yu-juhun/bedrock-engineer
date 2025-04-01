import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { useSettings } from './SettingsContext'
import { CustomAgent } from '@/types/agent-chat'

// コンテキストの型を定義
interface AgentDirectoryContextType {
  // 状態
  agents: CustomAgent[]
  isLoading: boolean
  searchQuery: string
  selectedAgent: CustomAgent | null
  allTags: string[]
  selectedTags: string[]

  // 操作関数
  setSearchQuery: (query: string) => void
  setSelectedAgent: (agent: CustomAgent | null) => void
  addSelectedAgentToMyAgents: () => Promise<void>
  handleTagToggle: (tag: string) => void
  clearTags: () => void
}

// コンテキストを作成
const AgentDirectoryContext = createContext<AgentDirectoryContextType | undefined>(undefined)

// プロバイダーコンポーネント
export const AgentDirectoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // SettingsContext から必要な関数とデータを取得
  const {
    directoryAgents,
    isDirectoryAgentLoading,
    loadDirectoryAgents,
    addDirectoryAgentToCustom
  } = useSettings()

  // 状態
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedAgent, setSelectedAgent] = useState<CustomAgent | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // すべてのタグをエージェントから抽出
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    directoryAgents.forEach((agent) => {
      if (agent.tags) {
        agent.tags.forEach((tag) => tagSet.add(tag))
      }
    })
    return Array.from(tagSet).sort()
  }, [directoryAgents])

  // タグの選択・解除を処理
  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags((prevTags) =>
      prevTags.includes(tag) ? prevTags.filter((t) => t !== tag) : [...prevTags, tag]
    )
  }, [])

  // すべてのタグをクリア
  const clearTags = useCallback(() => {
    setSelectedTags([])
  }, [])

  // フィルタリングされたエージェントのリスト
  const filteredAgents = useMemo(() => {
    return directoryAgents.filter((agent) => {
      // タグフィルタリング
      const passesTagFilter =
        selectedTags.length === 0 ||
        (agent.tags && selectedTags.every((tag) => agent.tags!.includes(tag)))

      // 検索クエリフィルタリング
      const passesSearchFilter =
        searchQuery === '' ||
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        false

      return passesTagFilter && passesSearchFilter
    })
  }, [directoryAgents, searchQuery, selectedTags])

  // 選択したエージェントをマイエージェントに追加
  const addSelectedAgentToMyAgents = useCallback(async (): Promise<void> => {
    if (!selectedAgent) {
      throw new Error('No agent selected')
    }

    const success = await addDirectoryAgentToCustom(selectedAgent)
    if (!success) {
      throw new Error('Failed to add agent')
    }
  }, [selectedAgent, addDirectoryAgentToCustom])

  // アプリケーション起動時にディレクトリエージェントを読み込み
  useEffect(() => {
    loadDirectoryAgents()
  }, [])

  // コンテキスト値の作成
  const value: AgentDirectoryContextType = {
    agents: filteredAgents,
    isLoading: isDirectoryAgentLoading,
    searchQuery,
    setSearchQuery,
    selectedAgent,
    setSelectedAgent,
    addSelectedAgentToMyAgents,
    allTags,
    selectedTags,
    handleTagToggle,
    clearTags
  }

  return <AgentDirectoryContext.Provider value={value}>{children}</AgentDirectoryContext.Provider>
}

// カスタムフック
export const useAgentDirectory = () => {
  const context = useContext(AgentDirectoryContext)
  if (context === undefined) {
    throw new Error('useAgentDirectory must be used within a AgentDirectoryProvider')
  }
  return context
}
