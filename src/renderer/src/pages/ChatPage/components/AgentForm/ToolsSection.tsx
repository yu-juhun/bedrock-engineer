import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AgentCategory,
  ToolState,
  KnowledgeBase,
  CommandConfig,
  McpServerConfig
} from '@/types/agent-chat'
import useSetting from '@renderer/hooks/useSetting'
import { useSettings } from '@renderer/contexts/SettingsContext'
import { ToggleSwitch } from 'flowbite-react'
import { toolIcons } from '../Tool/ToolIcons'
import { ToolName, isMcpTool, getOriginalMcpToolName } from '@/types/tools'
import { BedrockAgent } from '@/types/agent'
import { FiChevronDown, FiChevronRight, FiServer } from 'react-icons/fi'

// ツールをカテゴリ分けするための定義
interface ToolCategory {
  id: string
  name: string
  description: string
  tools: string[]
  hasMcpServers?: boolean // MCPサーバーが設定されているかどうかを示すフラグ
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
  },
  {
    id: 'mcp',
    name: 'MCP',
    description: 'Model Context Protocol Tools',
    // MCPツールは動的に取得するので空配列として定義
    tools: []
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
  mcpServers?: McpServerConfig[]
  tempMcpTools?: ToolState[] // 一時的なMCPツール（タブ切替時に取得したもの）
}

// ツール詳細情報モーダルコンポーネント
interface ToolInfoModalProps {
  toolName: string | null
  toolDescription: string
  onClose: () => void
  mcpServerInfo?: string
  isMcp?: boolean
}

const ToolInfoModal: React.FC<ToolInfoModalProps> = ({
  toolName,
  toolDescription,
  onClose,
  mcpServerInfo,
  isMcp
}) => {
  const { t } = useTranslation()

  // 非MCPツールや無効なツール名の場合は表示しない
  if (!toolName || !isMcp) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg max-w-md w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{getOriginalMcpToolName(toolName)}</h3>
            <span className="bg-cyan-100 text-cyan-800 text-xs font-medium px-2 py-0.5 rounded dark:bg-cyan-900 dark:text-cyan-300">
              MCP
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="prose dark:prose-invert max-w-none text-sm">
          <p className="mb-4">{toolDescription}</p>

          {mcpServerInfo && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                {t('Server Information')}
              </h4>
              <p className="text-xs">{mcpServerInfo}</p>
            </div>
          )}

          <div className="mt-4 p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-md border-l-4 border-cyan-500">
            <h4 className="text-sm font-medium text-cyan-700 dark:text-cyan-300 mb-1">
              {t('MCP Tool')}
            </h4>
            <p className="text-xs">
              {t(
                'This tool is provided by an MCP server and is always enabled. It cannot be disabled.'
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
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
  onBedrockAgentsChange,
  mcpServers = [],
  // onMcpServersChange, // 未使用のため削除
  tempMcpTools = []
}) => {
  const { t } = useTranslation()
  const { getDefaultToolsForCategory } = useSetting()
  const { getAgentMcpTools, selectedAgentId } = useSettings() // エージェント固有のMCPツールを取得する関数
  const [agentTools, setAgentTools] = useState<ToolState[]>(initialTools || [])
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory)
  const [activeTab, setActiveTab] = useState<string>('available-tools')
  const [toolInfoToShow, setToolInfoToShow] = useState<string | null>(null)

  // ツール設定の展開状態を管理するstate
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({})

  // initialTools が変更されたら同期
  useEffect(() => {
    if (initialTools?.length > 0) {
      setAgentTools(initialTools)
    }
  }, [initialTools])

  // エージェント固有のMCPツールを取得
  // サーバーが0件の場合は常に空配列を返す（整合性保証のため）
  // それ以外の場合：一時的なMCPツールが提供されている場合はそちらを優先し、なければエージェント固有のツールを使用
  const agentMcpTools = React.useMemo(() => {
    // MCPサーバーがない場合は常に空配列
    if (!mcpServers || mcpServers.length === 0) {
      return []
    }

    // 一時的なツールがあればそちらを優先
    return tempMcpTools.length > 0 ? tempMcpTools : getAgentMcpTools(selectedAgentId)
  }, [mcpServers, tempMcpTools, getAgentMcpTools, selectedAgentId])

  // MCPツールとエージェントツールの統合
  useEffect(() => {
    if (agentMcpTools && agentMcpTools.length > 0) {
      console.log('Integrating MCP tools into agent tools:', agentMcpTools.length)

      // 既存のツールからMCPツール(mcp:のプレフィックスを持つツール)を除外
      const nonMcpTools = agentTools.filter(
        (tool) => !tool.toolSpec?.name || !isMcpTool(tool.toolSpec.name)
      )

      // 統合したツールセット（MCPツールは常に有効）
      const mcpToolsWithState = agentMcpTools.map((tool) => ({
        ...tool,
        // MCP ツールは常に有効
        enabled: true
      }))

      const mergedTools = [...nonMcpTools, ...mcpToolsWithState]
      setAgentTools(mergedTools)

      // 親コンポーネントに通知
      // ただし初期化中に不要な更新が発生するのを防ぐためにタイムアウトを使用
      setTimeout(() => {
        onChange(mergedTools)
      }, 0)
    }
  }, [agentMcpTools, onChange])

  // ツール設定変更のハンドラ
  const handleToggleTool = (toolName: string) => {
    // MCP ツールの場合は常に有効なので変更しない
    if (isMcpTool(toolName)) {
      return
    }

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
    // まず全ツールのリストを確認
    console.log('Total tools available:', agentTools.map((t) => t.toolSpec?.name).filter(Boolean))

    // MCPツールを抽出 - エージェント固有のMCPツールを使用
    const availableMcpTools = agentTools.filter((tool) => {
      const toolName = tool.toolSpec?.name
      return toolName ? isMcpTool(toolName) : false
    })

    // MCPツールの存在をログ出力
    console.log(
      'MCP tools available:',
      availableMcpTools.length,
      'names:',
      availableMcpTools.map((t) => t.toolSpec?.name).join(', ')
    )

    // MCPサーバー設定の有無を確認
    const hasMcpServers = mcpServers && mcpServers.length > 0

    // MCPサーバーがない場合は、MCPカテゴリを結果から除外するフィルタを適用
    const filteredCategories = TOOL_CATEGORIES.filter((category) => {
      // MCPカテゴリの場合、サーバーがない場合は除外
      if (category.id === 'mcp') {
        return hasMcpServers
      }
      // 他のカテゴリは常に含める
      return true
    })

    const toolsByCategory = filteredCategories.map((category) => {
      // MCP カテゴリの場合は特別処理
      if (category.id === 'mcp') {
        // MCPツールのみをフィルタリング - 上で抽出済みのMCPツールを使用
        const mcpToolStates = availableMcpTools

        // MCPサーバー情報の詳細をログ出力
        console.log('MCP tools found:', mcpToolStates.length, 'Servers configured:', hasMcpServers)
        if (hasMcpServers) {
          console.log('MCP servers:', mcpServers.map((s) => s.name).join(', '))
        }

        return {
          ...category,
          toolsData: mcpToolStates,
          hasMcpServers, // MCPサーバーがあるかどうかのフラグ
          mcpServersInfo: mcpServers // サーバー情報も含める
        }
      }

      // 通常のツールカテゴリの場合
      // MCPツールは除外するが、他のすべての標準ツールはカテゴリに含める
      const toolsInCategory =
        agentTools?.filter((tool) => {
          const toolName = tool.toolSpec?.name
          if (!toolName) return false
          // MCPツールは除外し、カテゴリに含まれるツールを表示
          return category.tools.includes(toolName) && !isMcpTool(toolName)
        }) || []

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
      // MCPツールはカウントしない（MCPツールは詳細設定のカウントに含めないよう修正）
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

  // 選択されたツールの詳細情報を取得 (MCPツールのみ詳細表示)
  const getToolDescription = (toolName: string | null): string => {
    if (!toolName || !isMcpTool(toolName)) return ''

    // MCP ツールの場合のみ説明を返す
    const tool = agentTools.find((t) => t.toolSpec?.name === toolName)
    return tool?.toolSpec?.description || t('MCP tool from Model Context Protocol server')
  }

  // MCP ツールのサーバー情報を取得
  const getMcpServerInfo = (toolName: string | null): string => {
    if (!toolName || !isMcpTool(toolName) || !mcpServers || mcpServers.length === 0) return ''

    const serverName = getOriginalMcpToolName(toolName)?.split('.')[0]
    const server = mcpServers.find((s) => s.name === serverName)

    return server
      ? `${t('From')}: ${server.name} (${server.description || 'MCP Server'})`
      : `${t('From')}: ${serverName || 'Unknown server'}`
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
      {/* ツール情報モーダル */}
      {toolInfoToShow && (
        <ToolInfoModal
          toolName={toolInfoToShow}
          toolDescription={getToolDescription(toolInfoToShow)}
          mcpServerInfo={getMcpServerInfo(toolInfoToShow)}
          isMcp={toolInfoToShow ? isMcpTool(toolInfoToShow) : false}
          onClose={() => setToolInfoToShow(null)}
        />
      )}
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

              {/* MCPカテゴリの状態に応じたメッセージ表示 */}
              {category.id === 'mcp' && (
                <>
                  {/* サーバーが設定されていない場合の警告表示 */}
                  {category.hasMcpServers === false ? (
                    <div className="p-3 mt-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 rounded-md">
                      <div className="flex items-center mb-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                        <span className="font-medium">{t('Warning')}</span>
                      </div>
                      <p className="text-sm ml-7">
                        {t(
                          'No MCP servers configured for this agent. Configure MCP servers in the MCP Servers tab to use MCP tools.'
                        )}
                      </p>
                    </div>
                  ) : category.toolsData.length === 0 ? (
                    // サーバーがあってもツールがなければ情報表示
                    <div className="p-3 mt-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md">
                      <div className="flex items-center mb-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="font-medium">{t('Information')}</span>
                      </div>
                      <p className="text-sm ml-7">
                        {t(
                          'MCP servers are configured, but no tools are available. Make sure MCP servers are running and providing tools.'
                        )}
                      </p>
                      <div className="mt-2 ml-7 text-xs">
                        <p className="font-medium mb-1">{t('Configured MCP Servers')}:</p>
                        <ul className="list-disc pl-4">
                          {mcpServers.map((server, idx) => (
                            <li key={idx}>
                              <span className="font-mono">{server.name}</span>
                              {server.description && (
                                <span className="ml-1">({server.description})</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    category.toolsData.length > 0 && (
                      // サーバーとツールが両方ある場合は情報バナー表示
                      <div className="p-3 mt-2 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-300 rounded-md">
                        <div className="flex items-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 mr-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span className="font-medium">
                            {t('MCP tools available from configured servers')} (
                            {category.toolsData.length})
                          </span>
                        </div>
                        <div className="mt-2 ml-7 text-sm flex items-center">
                          <span className="bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded dark:bg-cyan-900 dark:text-cyan-300 font-medium mr-2">
                            {t('Note')}
                          </span>
                          <span>{t('MCP tools are always enabled and cannot be disabled')}</span>
                        </div>
                      </div>
                    )
                  )}
                </>
              )}

              {/* ツールリスト */}
              {category.toolsData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-3">
                  {category.toolsData.map((tool) => {
                    const toolName = tool.toolSpec?.name
                    if (!toolName) return null

                    return (
                      <div
                        key={toolName}
                        className={`flex items-center justify-between p-3 ${
                          isMcpTool(toolName)
                            ? 'bg-cyan-50 dark:bg-cyan-900/10 border border-cyan-200 dark:border-cyan-800'
                            : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                        } rounded-md shadow-sm`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="text-gray-500 dark:text-gray-400 flex-shrink-0 w-7 h-7 flex items-center justify-center">
                            {toolName && isMcpTool(toolName) ? (
                              <FiServer className="h-5 w-5" />
                            ) : toolName ? (
                              toolIcons[toolName as ToolName]
                            ) : null}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 dark:text-gray-200">
                              {toolName && isMcpTool(toolName)
                                ? getOriginalMcpToolName(toolName)
                                : toolName}
                              {toolName && isMcpTool(toolName) && (
                                <span className="ml-1 text-xs font-normal bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 py-0.5 px-1 rounded">
                                  MCP
                                </span>
                              )}
                            </p>
                            <div>
                              {toolName && isMcpTool(toolName) ? (
                                <p
                                  className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 overflow-hidden cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 underline decoration-dotted"
                                  title={t('Click for more information')}
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setToolInfoToShow(toolName)
                                  }}
                                >
                                  {tool.toolSpec?.description ||
                                    t('MCP tool from Model Context Protocol server')}
                                  {/* サーバー情報が見つかれば表示 */}
                                  {mcpServers && mcpServers.length > 0 && (
                                    <span className="block mt-0.5 text-blue-600 dark:text-blue-400 truncate">
                                      {t('From')}:{' '}
                                      {(() => {
                                        const serverName =
                                          getOriginalMcpToolName(toolName)?.split('.')[0]
                                        const server = mcpServers.find((s) => s.name === serverName)
                                        return server
                                          ? `${server.name} (${server.description || 'MCP Server'})`
                                          : serverName || 'Unknown server'
                                      })()}
                                    </span>
                                  )}
                                </p>
                              ) : (
                                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 overflow-hidden">
                                  {toolName ? t(`tool descriptions.${toolName}`) : ''}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          {isMcpTool(toolName) ? (
                            <div className="flex items-center">
                              <span className="text-xs text-cyan-600 dark:text-cyan-400 mr-2">
                                Always enabled
                              </span>
                              <ToggleSwitch
                                checked={true}
                                onChange={() => {}}
                                disabled={true}
                                label=""
                              />
                            </div>
                          ) : (
                            <ToggleSwitch
                              checked={tool.enabled}
                              onChange={() => handleToggleTool(toolName)}
                              label=""
                            />
                          )}
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
