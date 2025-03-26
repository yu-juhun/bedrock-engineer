import { useState, useEffect, useMemo } from 'react'
import { useSettings } from '@renderer/contexts/SettingsContext'
import { CustomAgent } from '@/types/agent-chat'
// import { useTranslation } from 'react-i18next'

export const useAgentDirectory = () => {
  // Translation handled in the components
  // const { t } = useTranslation('agentDirectory')
  const {
    directoryAgents,
    isDirectoryAgentLoading,
    loadDirectoryAgents,
    addDirectoryAgentToCustom
  } = useSettings()

  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedAgent, setSelectedAgent] = useState<CustomAgent | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // Get all unique tags from all agents
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    directoryAgents.forEach((agent) => {
      if (agent.tags) {
        agent.tags.forEach((tag) => tagSet.add(tag))
      }
    })
    return Array.from(tagSet).sort()
  }, [directoryAgents])

  // Handle tag selection toggle
  const handleTagToggle = (tag: string) => {
    setSelectedTags((prevTags) =>
      prevTags.includes(tag) ? prevTags.filter((t) => t !== tag) : [...prevTags, tag]
    )
  }

  // Clear all selected tags
  const clearTags = () => {
    setSelectedTags([])
  }

  // フィルタリングされたエージェントリスト
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

  // 現在選択されているエージェントをマイエージェントとして追加
  const addSelectedAgentToMyAgents = async (): Promise<void> => {
    if (!selectedAgent) {
      throw new Error('No agent selected')
    }

    const success = await addDirectoryAgentToCustom(selectedAgent)
    if (!success) {
      throw new Error('Failed to add agent')
    }
  }

  useEffect(() => {
    // 初回レンダリング時にディレクトリエージェントをロード
    loadDirectoryAgents()
  }, [])

  return {
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
}
