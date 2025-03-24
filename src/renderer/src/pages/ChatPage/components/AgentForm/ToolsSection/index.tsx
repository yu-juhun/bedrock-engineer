import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AgentCategory, ToolState, KnowledgeBase, CommandConfig } from '@/types/agent-chat'
import useSetting from '@renderer/hooks/useSetting'
import { ToggleSwitch } from 'flowbite-react'
import { toolIcons } from '../../../components/Tool/ToolIcons'
import { ToolName } from '@/types/tools'
import { BedrockAgent } from '@/types/agent'
import { FiChevronDown, FiChevronRight } from 'react-icons/fi'

// ツールをカテゴリ分けするための定義
interface ToolCategory {
  id: string
  name: string
  description: string
  tools: string[]
}

const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: 'file-system',
    name: 'File System',
    description: 'Tools for managing files and directories',
    tools: [
      'createFolder',
      'writeToFile',
      'readFiles',
      'listFiles',
      'moveFile',
      'copyFile',
      'applyDiffEdit'
    ]
  },
  {
    id: 'web-interaction',
    name: 'Web & Search',
    description: 'Tools for interacting with web resources',
    tools: ['tavilySearch', 'fetchWebsite']
  },
  {
    id: 'ai-services',
    name: 'AI Services',
    description: 'Tools that utilize AWS AI services',
    tools: ['generateImage', 'retrieve', 'invokeBedrockAgent']
  },
  {
    id: 'system',
    name: 'System',
    description: 'Tools for system interaction',
    tools: ['executeCommand']
  },
  {
    id: 'thinking',
    name: 'Thinking',
    description: 'Tools for enhanced reasoning and complex problem solving',
    tools: ['think']
  }
]

type ToolsSectionProps = {
  agentId?: string
  tools: ToolState[]
  onChange: (tools: ToolState[]) => void
  agentCategory?: AgentCategory
  onCategoryChange?: (category: AgentCategory) => void
  knowledgeBases?: KnowledgeBase[]
  onKnowledgeBasesChange?: (knowledgeBases: KnowledgeBase[]) => void
  allowedCommands?: CommandConfig[]
  onAllowedCommandsChange?: (commands: CommandConfig[]) => void
  bedrockAgents?: BedrockAgent[]
  onBedrockAgentsChange?: (agents: BedrockAgent[]) => void
}

export const ToolsSection: React.FC<ToolsSectionProps> = ({
  tools: initialTools,
  onChange,
  agentCategory: initialCategory = 'general',
  onCategoryChange,
  knowledgeBases = [],
  onKnowledgeBasesChange,
  allowedCommands = [],
  onAllowedCommandsChange,
  bedrockAgents = [],
  onBedrockAgentsChange
}) => {
  const { t } = useTranslation()
  const { getDefaultToolsForCategory } = useSetting()
  const [agentTools, setAgentTools] = useState<ToolState[]>(initialTools || [])
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory)
  const [activeTab, setActiveTab] = useState<string>('available-tools')

  // ツール設定の展開状態を管理するstate
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({})

  // initialTools が変更されたら同期
  useEffect(() => {
    if (initialTools?.length > 0) {
      setAgentTools(initialTools)
    }
  }, [initialTools])

  // ツール設定変更のハンドラ
  const handleToggleTool = (toolName: string) => {
    const updatedTools = agentTools.map((tool) => {
      if (tool.toolSpec?.name === toolName) {
        return { ...tool, enabled: !tool.enabled }
      }
      return tool
    })
    setAgentTools(updatedTools)
    onChange(updatedTools)
  }

  // カテゴリー選択のハンドラ
  const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = event.target.value
    setSelectedCategory(newCategory)

    // カテゴリーに基づいたデフォルトツール設定をロード
    const defaultTools = getDefaultToolsForCategory(newCategory)
    setAgentTools(defaultTools)
    onChange(defaultTools)

    // 親コンポーネントのカテゴリ変更ハンドラがあれば呼び出す
    if (onCategoryChange && newCategory) {
      onCategoryChange(newCategory as AgentCategory)
    }
  }

  // 各カテゴリのツールを取得する
  const getToolsByCategory = () => {
    const toolsByCategory = TOOL_CATEGORIES.map((category) => {
      const toolsInCategory =
        agentTools?.filter(
          (tool) => tool.toolSpec?.name && category.tools.includes(tool.toolSpec.name)
        ) || []

      return {
        ...category,
        toolsData: toolsInCategory
      }
    })

    return toolsByCategory
  }

  // ツールの展開状態を切り替える
  const toggleToolExpand = (toolName: string) => {
    setExpandedTools((prev) => ({
      ...prev,
      [toolName]: !prev[toolName]
    }))
  }

  // 有効なツールのみを取得
  const getEnabledTools = () => {
    return agentTools.filter((tool) => tool.enabled && tool.toolSpec?.name)
  }

  // Knowledge Bases設定変更
  const handleKnowledgeBasesChange = (kbs: KnowledgeBase[]) => {
    if (onKnowledgeBasesChange) {
      onKnowledgeBasesChange(kbs)
    }
  }

  // Commands設定変更
  const handleCommandsChange = (commands: CommandConfig[]) => {
    if (onAllowedCommandsChange) {
      onAllowedCommandsChange(commands)
    }
  }

  // Bedrock Agents設定変更
  const handleBedrockAgentsChange = (agents: BedrockAgent[]) => {
    if (onBedrockAgentsChange) {
      onBedrockAgentsChange(agents)
    }
  }

  const categorizedTools = getToolsByCategory()
  const enabledTools = getEnabledTools()
  const enabledNeedsDetailSettingsTools = enabledTools.filter((tool) => {
    return (
      tool.toolSpec?.name === 'retrieve' ||
      tool.toolSpec?.name === 'invokeBedrockAgent' ||
      tool.toolSpec?.name === 'executeCommand'
    )
  })

  // 特定のツール名が有効化されているか確認する関数
  const isToolEnabled = (toolName: string) => {
    return agentTools.some((tool) => tool.toolSpec?.name === toolName && tool.enabled)
  }

  // ツール設定が必要なツールのリスト
  const toolsWithConfigurations = {
    retrieve: {
      title: t('Knowledge Base Settings'),
      isEnabled: isToolEnabled('retrieve'),
      description: t('Configure knowledge bases for the retrieve tool')
    },
    executeCommand: {
      title: t('Command Settings'),
      isEnabled: isToolEnabled('executeCommand'),
      description: t('Configure allowed commands for the executeCommand tool')
    },
    invokeBedrockAgent: {
      title: t('Bedrock Agent Settings'),
      isEnabled: isToolEnabled('invokeBedrockAgent'),
      description: t('Configure Bedrock Agents for the invokeBedrockAgent tool')
    }
  }

  return (
    <div
      className="space-y-4"
      onClick={(e) => {
        // ツールセクション全体でのクリックイベント伝播を停止
        e.stopPropagation()
      }}
      onMouseUp={(e) => {
        // ブラウザによってはmouseupイベントもハンドリングする必要がある
        e.stopPropagation()
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Agent Tools</h3>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <ul className="flex flex-wrap -mb-px">
          <li className="mr-2">
            <button
              className={`inline-block p-4 border-b-2 rounded-t-lg ${
                activeTab === 'available-tools'
                  ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'text-gray-500 border-transparent hover:text-gray-600 hover:border-gray-300'
              }`}
              onClick={(e) => {
                e.preventDefault() // デフォルトの動作も防止
                e.stopPropagation() // イベント伝播を防止
                setActiveTab('available-tools')
              }}
              onMouseDown={(e) => {
                // マウスダウンイベントも防止
                e.preventDefault()
                e.stopPropagation()
              }}
            >
              {t('Available Tools')}
            </button>
          </li>
          <li>
            <button
              className={`inline-block p-4 border-b-2 rounded-t-lg ${
                activeTab === 'tool-detail-settings'
                  ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'text-gray-500 border-transparent hover:text-gray-600 hover:border-gray-300'
              }`}
              onClick={(e) => {
                e.preventDefault() // デフォルトの動作も防止
                e.stopPropagation() // イベント伝播を防止
                setActiveTab('tool-detail-settings')
              }}
              onMouseDown={(e) => {
                // マウスダウンイベントも防止
                e.preventDefault()
                e.stopPropagation()
              }}
            >
              {t('Tool Detail Settings')}
              {enabledNeedsDetailSettingsTools.length > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 ml-2 text-xs font-semibold text-blue-800 bg-blue-200 rounded-full">
                  {enabledNeedsDetailSettingsTools.length}
                </span>
              )}
            </button>
          </li>
        </ul>
      </div>

      {/* Available Tools タブ */}
      {activeTab === 'available-tools' && (
        <div className="space-y-3">
          <div className="flex items-center justify-end">
            <div className="flex items-center">
              <label className="mr-2 text-sm text-gray-700 dark:text-gray-300">
                {t('tools.category')}:
              </label>
              <select
                value={selectedCategory}
                onChange={handleCategoryChange}
                className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
              >
                <option value="general">{t('Tool Categories.General Purpose')}</option>
                <option value="coding">{t('Tool Categories.Software Development')}</option>
                <option value="design">{t('Tool Categories.Design & Creative')}</option>
                <option value="data">{t('Tool Categories.Data Analysis')}</option>
                <option value="business">{t('Tool Categories.Business & Productivity')}</option>
                <option value="custom">{t('Tool Categories.Custom Configuration')}</option>
                <option value="all">{t('Tool Categories.All Configuration')}</option>
              </select>
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 mt-1">
            {t('tools.description')}
          </p>

          {/* ツールリスト */}
          {categorizedTools.map((category) => (
            <div key={category.id} className="mb-4">
              {/* カテゴリヘッダー */}
              <div className="p-3 bg-blue-50 dark:bg-blue-800 font-medium sticky top-0 z-10 rounded-t-md">
                <div className="text-sm text-gray-800 dark:text-gray-200">
                  {t(`Tool Categories.${category.name}`)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {t(`Tool Categories.${category.name} Description`)}
                </div>
              </div>

              {/* ツールリスト */}
              {category.toolsData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-3">
                  {category.toolsData.map((tool) => {
                    const toolName = tool.toolSpec?.name
                    if (!toolName) return null

                    return (
                      <div
                        key={toolName}
                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-md shadow-sm border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="text-gray-500 dark:text-gray-400 flex-shrink-0 w-7 h-7 flex items-center justify-center">
                            {toolIcons[toolName as ToolName]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 dark:text-gray-200">
                              {toolName}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {t(`tool descriptions.${toolName}`)}
                            </p>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <ToggleSwitch
                            checked={tool.enabled}
                            onChange={() => handleToggleTool(toolName)}
                            label=""
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-3 text-center text-gray-500 dark:text-gray-400 text-sm">
                  {t('No tools in this category')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tool Detail Settings タブ */}
      {activeTab === 'tool-detail-settings' && (
        <div className="space-y-4">
          <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-1">
              {t('Configure settings for enabled tools')}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {t('Tool Detail Settings Description')}
            </p>
          </div>

          {enabledTools.length === 0 ? (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md text-center">
              <p className="text-gray-500 dark:text-gray-400">
                {t('No tools enabled. Enable tools in the Available Tools tab to configure them.')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* retrieve ツール設定 */}
              {toolsWithConfigurations.retrieve.isEnabled && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault() // デフォルトの動作も防止
                      e.stopPropagation() // イベント伝播を防止
                      toggleToolExpand('retrieve')
                    }}
                    onMouseDown={(e) => {
                      // マウスダウンイベントも防止
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-gray-600 dark:text-gray-300">
                        {expandedTools.retrieve ? <FiChevronDown /> : <FiChevronRight />}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800 dark:text-gray-200">
                          {toolsWithConfigurations.retrieve.title}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {toolsWithConfigurations.retrieve.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {expandedTools.retrieve && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                      {/* この部分にKnowledgeBasesSection のコンテンツをインポートします */}
                      <KnowledgeBasesContent
                        knowledgeBases={knowledgeBases}
                        onChange={handleKnowledgeBasesChange}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* executeCommand ツール設定 */}
              {toolsWithConfigurations.executeCommand.isEnabled && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault() // デフォルトの動作も防止
                      e.stopPropagation() // イベント伝播を防止
                      toggleToolExpand('executeCommand')
                    }}
                    onMouseDown={(e) => {
                      // マウスダウンイベントも防止
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-gray-600 dark:text-gray-300">
                        {expandedTools.executeCommand ? <FiChevronDown /> : <FiChevronRight />}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800 dark:text-gray-200">
                          {toolsWithConfigurations.executeCommand.title}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {toolsWithConfigurations.executeCommand.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {expandedTools.executeCommand && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                      {/* この部分にCommandsSection のコンテンツをインポートします */}
                      <CommandsContent commands={allowedCommands} onChange={handleCommandsChange} />
                    </div>
                  )}
                </div>
              )}

              {/* invokeBedrockAgent ツール設定 */}
              {toolsWithConfigurations.invokeBedrockAgent.isEnabled && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault() // デフォルトの動作も防止
                      e.stopPropagation() // イベント伝播を防止
                      toggleToolExpand('invokeBedrockAgent')
                    }}
                    onMouseDown={(e) => {
                      // マウスダウンイベントも防止
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-gray-600 dark:text-gray-300">
                        {expandedTools.invokeBedrockAgent ? <FiChevronDown /> : <FiChevronRight />}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800 dark:text-gray-200">
                          {toolsWithConfigurations.invokeBedrockAgent.title}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {toolsWithConfigurations.invokeBedrockAgent.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {expandedTools.invokeBedrockAgent && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                      {/* この部分にBedrockAgentsSection のコンテンツをインポートします */}
                      <BedrockAgentsContent
                        agents={bedrockAgents}
                        onChange={handleBedrockAgentsChange}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 有効なツールがあるが、設定が必要なツールがない場合 */}
              {enabledTools.length > 0 &&
                !Object.values(toolsWithConfigurations).some((config) => config.isEnabled) && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                      {t(
                        'No configurable tools enabled. Enable retrieve, executeCommand, or invokeBedrockAgent tools to access their configurations.'
                      )}
                    </p>
                  </div>
                )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// KnowledgeBasesContent コンポーネント
interface KnowledgeBasesContentProps {
  knowledgeBases: KnowledgeBase[]
  onChange: (knowledgeBases: KnowledgeBase[]) => void
}

const KnowledgeBasesContent: React.FC<KnowledgeBasesContentProps> = ({
  knowledgeBases,
  onChange
}) => {
  const { t } = useTranslation()
  const [newId, setNewId] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [editMode, setEditMode] = useState<string | null>(null)
  const [editData, setEditData] = useState<KnowledgeBase>({
    knowledgeBaseId: '',
    description: ''
  })

  const handleAddKnowledgeBase = () => {
    if (newId.trim() && newDescription.trim()) {
      onChange([
        ...knowledgeBases,
        {
          knowledgeBaseId: newId.trim(),
          description: newDescription.trim()
        }
      ])
      setNewId('')
      setNewDescription('')
    }
  }

  const handleRemoveKnowledgeBase = (id: string) => {
    onChange(knowledgeBases.filter((kb) => kb.knowledgeBaseId !== id))
  }

  const handleEditKnowledgeBase = (kb: KnowledgeBase) => {
    setEditMode(kb.knowledgeBaseId)
    setEditData({ ...kb })
  }

  const handleSaveEdit = () => {
    if (editData.knowledgeBaseId.trim() && editData.description.trim()) {
      onChange(knowledgeBases.map((kb) => (kb.knowledgeBaseId === editMode ? { ...editData } : kb)))
      setEditMode(null)
      setEditData({
        knowledgeBaseId: '',
        description: ''
      })
    }
  }

  const handleCancelEdit = () => {
    setEditMode(null)
    setEditData({
      knowledgeBaseId: '',
      description: ''
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t('Configure which knowledge bases this agent can access.')}
      </p>

      {/* Knowledge Base 追加フォーム */}
      <div className="flex flex-col gap-2 mt-4">
        <h4 className="font-medium text-sm mb-2">{t('Add New Knowledge Base')}</h4>

        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            {t('Knowledge Base ID')}
          </label>
          <input
            type="text"
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            placeholder={t('e.g., KB123456')}
            className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
          />
        </div>

        <div className="mt-2">
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            {t('Description')}
          </label>
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="e.g., Customer support knowledge base"
            rows={2}
            className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 resize-vertical"
          />
        </div>

        <button
          onClick={(e) => {
            e.preventDefault() // デフォルトの動作も防止
            e.stopPropagation() // イベント伝播を防止
            handleAddKnowledgeBase()
          }}
          onMouseDown={(e) => {
            // マウスダウンイベントも防止
            e.preventDefault()
            e.stopPropagation()
          }}
          disabled={!newId.trim() || !newDescription.trim()}
          className="px-4 py-1.5 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed mt-2 w-fit"
        >
          {t('Add Knowledge Base')}
        </button>
      </div>

      {/* 登録済み Knowledge Base リスト */}
      <div className="space-y-3 mt-6">
        <h4 className="font-medium text-sm">{t('Available Knowledge Bases')}</h4>
        <div className="grid grid-cols-1 gap-2">
          {knowledgeBases.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              {t('No knowledge bases registered yet')}
            </p>
          ) : (
            knowledgeBases.map((kb) => (
              <div
                key={kb.knowledgeBaseId}
                className="flex flex-col p-3 text-sm bg-gray-100 dark:bg-gray-900 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-700"
              >
                {editMode === kb.knowledgeBaseId ? (
                  // 編集モード
                  <div className="flex flex-col gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        {t('Knowledge Base ID')}
                      </label>
                      <input
                        type="text"
                        value={editData.knowledgeBaseId}
                        onChange={(e) =>
                          setEditData({ ...editData, knowledgeBaseId: e.target.value })
                        }
                        className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                      />
                    </div>
                    <div className="mt-2">
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        {t('Description')}
                      </label>
                      <textarea
                        value={editData.description}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        rows={2}
                        className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 resize-vertical"
                      />
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation() // イベント伝播を防止
                          handleCancelEdit()
                        }}
                        className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        {t('Cancel')}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation() // イベント伝播を防止
                          handleSaveEdit()
                        }}
                        disabled={!editData.knowledgeBaseId.trim() || !editData.description.trim()}
                        className="px-3 py-1 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {t('Save')}
                      </button>
                    </div>
                  </div>
                ) : (
                  // 表示モード
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{kb.description}</span>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          <div>
                            <span className="font-mono">ID:</span> {kb.knowledgeBaseId}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation() // イベント伝播を防止
                            handleEditKnowledgeBase(kb)
                          }}
                          className="text-blue-500 hover:text-blue-600 p-1"
                          title={t('Edit')}
                          aria-label={t('Edit knowledge base')}
                        >
                          <span className="sr-only">{t('Edit')}</span>
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation() // イベント伝播を防止
                            handleRemoveKnowledgeBase(kb.knowledgeBaseId)
                          }}
                          className="text-red-500 hover:text-red-600 p-1"
                          title={t('Remove')}
                          aria-label={t('Remove knowledge base')}
                        >
                          <span className="sr-only">{t('Remove')}</span>
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// CommandsContent コンポーネント
interface CommandsContentProps {
  commands: CommandConfig[]
  onChange: (commands: CommandConfig[]) => void
}

const CommandsContent: React.FC<CommandsContentProps> = ({ commands = [], onChange }) => {
  const { t } = useTranslation()
  const [newCommand, setNewCommand] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [editMode, setEditMode] = useState<string | null>(null)
  const [editData, setEditData] = useState<CommandConfig>({ pattern: '', description: '' })

  const handleAddCommand = () => {
    if (newCommand.trim() && newDescription.trim()) {
      onChange([
        ...commands,
        {
          pattern: newCommand.trim(),
          description: newDescription.trim()
        }
      ])
      setNewCommand('')
      setNewDescription('')
    }
  }

  const handleRemoveCommand = (pattern: string) => {
    onChange(commands.filter((cmd) => cmd.pattern !== pattern))
  }

  const handleEditCommand = (command: CommandConfig) => {
    setEditMode(command.pattern)
    setEditData({ ...command })
  }

  const handleSaveEdit = () => {
    if (editData.pattern.trim() && editData.description.trim()) {
      onChange(commands.map((cmd) => (cmd.pattern === editMode ? { ...editData } : cmd)))
      setEditMode(null)
      setEditData({ pattern: '', description: '' })
    }
  }

  const handleCancelEdit = () => {
    setEditMode(null)
    setEditData({ pattern: '', description: '' })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t('Configure which system commands the agent is allowed to execute.')}
      </p>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md">
        <h5 className="font-medium mb-1 text-yellow-800 dark:text-yellow-300 text-sm">
          {t('Security Warning')}
        </h5>
        <p className="text-xs text-gray-700 dark:text-gray-300">
          {t(
            'Only allow commands that you trust this agent to execute. Use wildcards (*) to define patterns.'
          )}
        </p>
      </div>

      {/* コマンド追加フォーム */}
      <div className="flex flex-col gap-2 mt-4">
        <h4 className="font-medium text-sm mb-2">{t('Add New Command Pattern')}</h4>
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            {t('Command Pattern')}
          </label>
          <input
            type="text"
            value={newCommand}
            onChange={(e) => setNewCommand(e.target.value)}
            placeholder="e.g., ls *"
            className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t('Use * as a wildcard (e.g., "npm *" allows all npm commands)')}
          </p>
        </div>
        <div className="mt-2">
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            {t('Description')}
          </label>
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="e.g., List directory contents"
            rows={2}
            className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 resize-vertical"
          />
        </div>
        <button
          onClick={handleAddCommand}
          disabled={!newCommand.trim() || !newDescription.trim()}
          className="px-4 py-1.5 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed mt-2 w-fit"
        >
          {t('Add Command')}
        </button>
      </div>

      {/* 登録済みコマンドリスト */}
      <div className="space-y-3 mt-6">
        <h4 className="font-medium text-sm">{t('Current Command Patterns')}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {commands.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              {t('No command patterns registered yet')}
            </p>
          ) : (
            commands.map((command) => (
              <div
                key={command.pattern}
                className="flex flex-col p-3 text-sm bg-gray-100 dark:bg-gray-900 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-700"
              >
                {editMode === command.pattern ? (
                  // 編集モード
                  <div className="flex flex-col gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        {t('Command Pattern')}
                      </label>
                      <input
                        type="text"
                        value={editData.pattern}
                        onChange={(e) => setEditData({ ...editData, pattern: e.target.value })}
                        className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                      />
                    </div>
                    <div className="mt-2">
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        {t('Description')}
                      </label>
                      <textarea
                        value={editData.description}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        rows={2}
                        className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 resize-vertical"
                      />
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        {t('Cancel')}
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        disabled={!editData.pattern.trim() || !editData.description.trim()}
                        className="px-3 py-1 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {t('Save')}
                      </button>
                    </div>
                  </div>
                ) : (
                  // 表示モード
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-medium">{command.pattern}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditCommand(command)}
                          className="text-blue-500 hover:text-blue-600 p-1"
                          title={t('Edit')}
                          aria-label={t('Edit command')}
                        >
                          <span className="sr-only">{t('Edit')}</span>
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleRemoveCommand(command.pattern)}
                          className="text-red-500 hover:text-red-600 p-1"
                          title={t('Remove')}
                          aria-label={t('Remove command')}
                        >
                          <span className="sr-only">{t('Remove')}</span>
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 whitespace-pre-line">
                      {command.description}
                    </p>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// BedrockAgentsContent コンポーネント
interface BedrockAgentsContentProps {
  agents: BedrockAgent[]
  onChange: (agents: BedrockAgent[]) => void
}

const BedrockAgentsContent: React.FC<BedrockAgentsContentProps> = ({ agents = [], onChange }) => {
  const { t } = useTranslation()
  const [newAgentId, setNewAgentId] = useState('')
  const [newAliasId, setNewAliasId] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [editMode, setEditMode] = useState<string | null>(null)
  const [editData, setEditData] = useState<BedrockAgent>({
    agentId: '',
    aliasId: '',
    description: ''
  })

  const handleAddAgent = () => {
    if (newAgentId.trim() && newAliasId.trim() && newDescription.trim()) {
      onChange([
        ...agents,
        {
          agentId: newAgentId.trim(),
          aliasId: newAliasId.trim(),
          description: newDescription.trim()
        }
      ])
      setNewAgentId('')
      setNewAliasId('')
      setNewDescription('')
    }
  }

  const handleRemoveAgent = (agentId: string) => {
    onChange(agents.filter((agent) => agent.agentId !== agentId))
  }

  const handleEditAgent = (agent: BedrockAgent) => {
    setEditMode(agent.agentId)
    setEditData({ ...agent })
  }

  const handleSaveEdit = () => {
    if (editData.agentId.trim() && editData.aliasId.trim() && editData.description.trim()) {
      onChange(agents.map((agent) => (agent.agentId === editMode ? { ...editData } : agent)))
      setEditMode(null)
      setEditData({
        agentId: '',
        aliasId: '',
        description: ''
      })
    }
  }

  const handleCancelEdit = () => {
    setEditMode(null)
    setEditData({
      agentId: '',
      aliasId: '',
      description: ''
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t('Configure which Bedrock Agents this agent can access.')}
      </p>

      {/* Bedrock Agent 追加フォーム */}
      <div className="flex flex-col gap-2 mt-4">
        <h4 className="font-medium text-sm mb-2">{t('Add New Bedrock Agent')}</h4>

        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            {t('Agent ID')}
          </label>
          <input
            type="text"
            value={newAgentId}
            onChange={(e) => setNewAgentId(e.target.value)}
            placeholder="e.g., AGENT123456"
            className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
          />
        </div>

        <div className="mt-2">
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            {t('Alias ID')}
          </label>
          <input
            type="text"
            value={newAliasId}
            onChange={(e) => setNewAliasId(e.target.value)}
            placeholder="e.g., ALIAS123456"
            className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
          />
        </div>

        <div className="mt-2">
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
            {t('Description')}
          </label>
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="e.g., Code interpreter agent"
            rows={2}
            className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 resize-vertical"
          />
        </div>

        <button
          onClick={handleAddAgent}
          disabled={!newAgentId.trim() || !newAliasId.trim() || !newDescription.trim()}
          className="px-4 py-1.5 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed mt-2 w-fit"
        >
          {t('Add Agent')}
        </button>
      </div>

      {/* 登録済み Bedrock Agent リスト */}
      <div className="space-y-3 mt-6">
        <h4 className="font-medium text-sm">{t('Available Bedrock Agents')}</h4>
        <div className="grid grid-cols-1 gap-2">
          {agents.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              {t('No Bedrock Agents registered yet')}
            </p>
          ) : (
            agents.map((agent) => (
              <div
                key={agent.agentId}
                className="flex flex-col p-3 text-sm bg-gray-100 dark:bg-gray-900 dark:text-gray-300 rounded border border-gray-200 dark:border-gray-700"
              >
                {editMode === agent.agentId ? (
                  // 編集モード
                  <div className="flex flex-col gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        {t('Agent ID')}
                      </label>
                      <input
                        type="text"
                        value={editData.agentId}
                        onChange={(e) => setEditData({ ...editData, agentId: e.target.value })}
                        className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                      />
                    </div>
                    <div className="mt-2">
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        {t('Alias ID')}
                      </label>
                      <input
                        type="text"
                        value={editData.aliasId}
                        onChange={(e) => setEditData({ ...editData, aliasId: e.target.value })}
                        className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                      />
                    </div>
                    <div className="mt-2">
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        {t('Description')}
                      </label>
                      <textarea
                        value={editData.description}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        rows={2}
                        className="w-full p-2 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 resize-vertical"
                      />
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        {t('Cancel')}
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        disabled={
                          !editData.agentId.trim() ||
                          !editData.aliasId.trim() ||
                          !editData.description.trim()
                        }
                        className="px-3 py-1 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {t('Save')}
                      </button>
                    </div>
                  </div>
                ) : (
                  // 表示モード
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{agent.description}</span>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          <div>
                            <span className="font-mono">Agent ID:</span> {agent.agentId}
                          </div>
                          <div>
                            <span className="font-mono">Alias ID:</span> {agent.aliasId}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditAgent(agent)}
                          className="text-blue-500 hover:text-blue-600 p-1"
                          title={t('Edit')}
                          aria-label={t('Edit agent')}
                        >
                          <span className="sr-only">{t('Edit')}</span>
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleRemoveAgent(agent.agentId)}
                          className="text-red-500 hover:text-red-600 p-1"
                          title={t('Remove')}
                          aria-label={t('Remove agent')}
                        >
                          <span className="sr-only">{t('Remove')}</span>
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default ToolsSection
