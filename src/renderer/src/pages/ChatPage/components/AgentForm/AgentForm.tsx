import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import useSetting from '@renderer/hooks/useSetting'
import { AgentFormProps } from './types'
import { useAgentForm } from './useAgentForm'
import { BasicSection } from './BasicSection'
import { SystemPromptSection } from './SystemPromptSection'
import { ScenariosSection } from './ScenariosSection'
import { TagsSection } from './TagsSection'
import { ToolsSection } from './ToolsSection'
import { McpServerSection } from './McpServerSection'
import { useAgentGenerator } from '../../hooks/useAgentGenerator'
import { useScenarioGenerator } from '../../hooks/useScenarioGenerator'
import toast from 'react-hot-toast'
import { FiSave, FiSettings, FiServer, FiTool } from 'react-icons/fi'
import { useAgentFilter } from '../AgentList'
import { ToolState, AgentCategory } from '@/types/agent-chat'
import { ToolName } from '@/types/tools'

export const AgentForm: React.FC<AgentFormProps> = ({ agent, onSave, onCancel }) => {
  const { t } = useTranslation()
  const { projectPath, agents, getDefaultToolsForCategory } = useSetting()
  const { availableTags } = useAgentFilter(agents)

  const { formData, updateField, handleSubmit } = useAgentForm(agent, onSave)

  // タブナビゲーション用の単純なステート
  const [activeTab, setActiveTab] = useState<string>('basic')

  // ツールとカテゴリの状態
  const [agentTools, setAgentTools] = useState<ToolState[]>([])
  const [agentCategory, setAgentCategory] = useState<AgentCategory>('all')

  // MCPツール取得状態
  const [isLoadingMcpTools, setIsLoadingMcpTools] = useState<boolean>(false)
  const [tempMcpTools, setTempMcpTools] = useState<ToolState[]>([])

  // MCPサーバーが0件になった場合のuseEffect
  useEffect(() => {
    // サーバーが0件になった場合、ツールをクリア
    if (formData.mcpServers && formData.mcpServers.length === 0) {
      console.log('MCP servers empty, clearing tempMcpTools')
      setTempMcpTools([])
    }
  }, [formData.mcpServers])

  // システムプロンプト生成関連
  const { generateAgentSystemPrompt, generatedAgentSystemPrompt, isGenerating } =
    useAgentGenerator()

  // シナリオ生成関連
  const {
    generateScenarios,
    generatedScenarios,
    isGenerating: isGeneratingScenarios
  } = useScenarioGenerator()

  // 初期化処理 - ref を使用して初期化を一度だけ実行
  const initializationDone = React.useRef(false)

  useEffect(() => {
    // 初期化済みならスキップ
    if (initializationDone.current) {
      return
    }

    // 初期化実行済みとしてマーク
    initializationDone.current = true

    if (!agent) {
      // 新規エージェント - デフォルトツールを設定
      const defaultTools = getDefaultToolsForCategory('all')
      setAgentTools(defaultTools)

      const defaultToolNames = defaultTools
        .filter((tool) => tool.enabled)
        .map((tool) => tool.toolSpec?.name as ToolName)
        .filter(Boolean)

      // バッチ更新のために処理を一度にまとめる
      const updates: Array<[keyof typeof formData, any]> = [
        ['tools', defaultToolNames],
        ['category', 'all'],
        ['mcpServers', []], // 明示的に空の配列を設定
        ['allowedCommands', []], // 他の配列型フィールドも初期化
        ['knowledgeBases', []],
        ['bedrockAgents', []]
      ]

      // 状態更新をバッチ処理
      // setTimeout で更新処理を次のフレームに遅らせ、レンダリングの競合を防ぐ
      setTimeout(() => {
        updates.forEach(([field, value]) => updateField(field, value))
      }, 0)

      return
    }

    // 既存エージェントの編集
    const category = agent.category || 'all'
    setAgentCategory(category)

    // カテゴリに基づくデフォルトツール
    const defaultTools = getDefaultToolsForCategory(category)

    // エージェント固有のツール設定があればそれを適用
    if (agent.tools && agent.tools.length > 0) {
      const toolsWithState = defaultTools.map((toolState) => {
        const toolName = toolState.toolSpec?.name as ToolName
        const isEnabled = agent.tools?.includes(toolName) || false
        return { ...toolState, enabled: isEnabled }
      })
      setAgentTools(toolsWithState)
    } else {
      setAgentTools(defaultTools)
    }

    // MCPサーバー設定を確認してコンソールに出力
    console.log('Loading agent MCP servers:', agent.mcpServers || [])

    // 既存のエージェントが持つすべてのツール設定情報を明示的にformDataに設定
    setTimeout(() => {
      // mcpServersを明示的に設定
      updateField('mcpServers', agent.mcpServers || [])
      // 他のツール設定データも明示的に設定
      updateField('knowledgeBases', agent.knowledgeBases || [])
      updateField('allowedCommands', agent.allowedCommands || [])
      updateField('bedrockAgents', agent.bedrockAgents || [])

      console.log('Updated tool settings in formData:', {
        mcpServers: agent.mcpServers || [],
        knowledgeBases: agent.knowledgeBases || [],
        allowedCommands: agent.allowedCommands || [],
        bedrockAgents: agent.bedrockAgents || []
      })
    }, 0)

    // 依存配列は空に - コンポーネントマウント時に一度だけ実行
  }, [])

  // システムプロンプト自動生成ハンドラをメモ化
  const handleAutoGeneratePrompt = React.useCallback(async () => {
    if (!formData.name || !formData.description) {
      toast.error(t('pleaseEnterNameAndDescription'))
      return
    }
    await generateAgentSystemPrompt(formData.name, formData.description)
  }, [formData.name, formData.description, generateAgentSystemPrompt, t])

  // シナリオ生成ハンドラをメモ化
  const handleGenerateScenarios = React.useCallback(async () => {
    if (!formData.name || !formData.description || !formData.system) {
      toast.error(t('inputAgentInfoError'))
      return
    }
    await generateScenarios(formData.name, formData.description, formData.system)
  }, [formData.name, formData.description, formData.system, generateScenarios, t])

  // タブ切り替え時のMCPツール取得関数
  const fetchMcpTools = React.useCallback(async () => {
    // MCPサーバーが設定されていない場合は明示的にツールをクリア
    if (!formData.mcpServers || formData.mcpServers.length === 0) {
      console.log('No MCP servers available in fetchMcpTools, clearing tools')
      setTempMcpTools([])
      return
    }

    setIsLoadingMcpTools(true)
    try {
      // コンソールログで現在のMCPサーバー状態を表示（デバッグ用）
      console.log(
        'Fetching MCP tools for tab switch:',
        formData.mcpServers.length,
        'servers:',
        formData.mcpServers.map((s) => s.name).join(', ')
      )

      // サーバーがあるか念のため再確認（非同期処理中に変わる可能性があるため）
      if (formData.mcpServers.length === 0) {
        console.log('MCP servers became empty during async operation')
        setTempMcpTools([])
        return
      }

      const tools = await window.api.mcp.getToolSpecs(formData.mcpServers)

      if (tools && tools.length > 0) {
        console.log('Received MCP tools:', tools.length)
        // APIから取得したツールをToolState形式に変換
        const toolStates = tools.map((tool) => ({
          toolSpec: tool.toolSpec,
          // デフォルトで無効化
          enabled: false
        })) as ToolState[]

        // 現在のサーバー状態を再確認（念のため）
        if (formData.mcpServers && formData.mcpServers.length > 0) {
          setTempMcpTools(toolStates)
        } else {
          console.log('MCP servers were removed during tool fetch, ignoring results')
          setTempMcpTools([])
        }
      } else {
        console.log('No MCP tools found from servers')
        setTempMcpTools([])
      }
    } catch (error) {
      console.error('Failed to fetch MCP tools:', error)
      // エラー時は空のツールリスト
      setTempMcpTools([])
    } finally {
      setIsLoadingMcpTools(false)
    }
  }, [formData.mcpServers])

  // 生成されたシステムプロンプトを適用
  useEffect(() => {
    if (generatedAgentSystemPrompt) {
      updateField('system', generatedAgentSystemPrompt)
    }
  }, [generatedAgentSystemPrompt, updateField])

  // 生成されたシナリオを適用
  useEffect(() => {
    if (generatedScenarios.length > 0) {
      updateField('scenarios', generatedScenarios)
    }
  }, [generatedScenarios, updateField])

  // ツール設定変更ハンドラをメモ化して再レンダリング時の再作成を防止
  const handleToolsChange = React.useCallback(
    (tools: ToolState[]) => {
      setAgentTools(tools)

      // 有効なツール名のみを抽出
      const enabledToolNames = tools
        .filter((tool) => tool.enabled)
        .map((tool) => tool.toolSpec?.name as ToolName)
        .filter(Boolean)

      updateField('tools', enabledToolNames)
    },
    [updateField]
  )

  // カテゴリ変更ハンドラをメモ化
  const handleCategoryChange = React.useCallback(
    (category: AgentCategory) => {
      setAgentCategory(category)
      updateField('category', category)

      // カテゴリに基づくデフォルトツール
      const newTools = getDefaultToolsForCategory(category)
      setAgentTools(newTools)

      // 有効なツール名のみを抽出
      const enabledToolNames = newTools
        .filter((tool) => tool.enabled)
        .map((tool) => tool.toolSpec?.name as ToolName)
        .filter(Boolean)

      updateField('tools', enabledToolNames)
    },
    [getDefaultToolsForCategory, updateField]
  )

  return (
    <form
      onSubmit={(e) => {
        e.stopPropagation() // イベント伝播を停止
        console.log('Form onSubmit triggered')
        handleSubmit(e) // 元のhandleSubmitを呼び出し
      }}
      className="space-y-4"
      style={{ minHeight: '1100px' }}
      onClick={(e) => {
        // フォーム全体でクリックイベントの伝播を停止
        e.stopPropagation()
      }}
    >
      {/* タブナビゲーション */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <ul
          className="flex flex-wrap -mb-px"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          <li className="mr-2">
            <button
              type="button"
              className={`inline-flex items-center gap-1.5 p-4 border-b-2 rounded-t-lg ${
                activeTab === 'basic'
                  ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'text-gray-500 border-transparent hover:text-gray-600 hover:border-gray-300'
              }`}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setActiveTab('basic')
              }}
            >
              <FiSettings className="w-4 h-4" />
              {t('Basic Settings')}
            </button>
          </li>
          <li className="mr-2">
            <button
              type="button"
              className={`inline-flex items-center gap-1.5 p-4 border-b-2 rounded-t-lg ${
                activeTab === 'mcp-servers'
                  ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'text-gray-500 border-transparent hover:text-gray-600 hover:border-gray-300'
              }`}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setActiveTab('mcp-servers')
              }}
            >
              <FiServer className="w-4 h-4" />
              {t('MCP Servers')}
            </button>
          </li>
          <li>
            <button
              type="button"
              className={`inline-flex items-center gap-1.5 p-4 border-b-2 rounded-t-lg ${
                activeTab === 'tools'
                  ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'text-gray-500 border-transparent hover:text-gray-600 hover:border-gray-300'
              }`}
              onClick={async (e) => {
                e.preventDefault()
                e.stopPropagation()
                // ツールタブへの切り替え
                setActiveTab('tools')

                // MCPサーバーの状態に応じた処理
                if (!formData.mcpServers || formData.mcpServers.length === 0) {
                  // サーバーが0件の場合は必ずツールもクリア
                  console.log('No MCP servers when switching to tools tab, clearing tools')
                  setTempMcpTools([])
                } else {
                  // MCPサーバーがある場合はツールを取得
                  await fetchMcpTools()
                }
              }}
            >
              <FiTool className="w-4 h-4" />
              {t('Tools')}
            </button>
          </li>
        </ul>
      </div>

      {/* Basic Settings タブコンテンツ */}
      {activeTab === 'basic' && (
        <div className="space-y-6 overflow-y-auto max-h-[900px] pb-4">
          <BasicSection
            name={formData.name}
            description={formData.description}
            icon={formData.icon}
            iconColor={formData.iconColor}
            onChange={(field, value) => updateField(field, value)}
          />

          <SystemPromptSection
            system={formData.system}
            name={formData.name}
            description={formData.description}
            onChange={(value) => updateField('system', value)}
            onAutoGenerate={handleAutoGeneratePrompt}
            isGenerating={isGenerating}
            projectPath={projectPath}
            allowedCommands={formData.allowedCommands || []}
            knowledgeBases={formData.knowledgeBases || []}
            bedrockAgents={formData.bedrockAgents || []}
          />

          <ScenariosSection
            scenarios={formData.scenarios}
            name={formData.name}
            description={formData.description}
            system={formData.system}
            onChange={(scenarios) => updateField('scenarios', scenarios)}
            isGenerating={isGeneratingScenarios}
            onAutoGenerate={handleGenerateScenarios}
          />

          <TagsSection
            tags={formData.tags || []}
            availableTags={availableTags}
            onChange={(tags) => updateField('tags', tags)}
          />
        </div>
      )}

      {/* MCP Servers タブコンテンツ */}
      {activeTab === 'mcp-servers' && (
        <div
          className="overflow-y-auto max-h-[900px] pb-4"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          <McpServerSection
            mcpServers={formData.mcpServers || []}
            onChange={async (servers) => {
              updateField('mcpServers', servers)
              // サーバー設定が変更されたら、タブに関わらずtempMcpToolsをクリア
              setTempMcpTools([])
            }}
          />
        </div>
      )}

      {/* Tools タブコンテンツ */}
      {activeTab === 'tools' && (
        <div className="overflow-y-auto max-h-[900px] pb-4">
          {isLoadingMcpTools ? (
            <div className="flex flex-col items-center justify-center p-8">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full w-3/4 animate-pulse"></div>
              </div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                {t('MCPサーバーからツールを取得中...')}
              </p>
            </div>
          ) : (
            <ToolsSection
              tools={agentTools}
              onChange={handleToolsChange}
              agentCategory={agentCategory}
              onCategoryChange={handleCategoryChange}
              // 統合された設定を渡す
              knowledgeBases={formData.knowledgeBases || []}
              onKnowledgeBasesChange={(kbs) => updateField('knowledgeBases', kbs)}
              allowedCommands={formData.allowedCommands || []}
              onAllowedCommandsChange={(commands) => updateField('allowedCommands', commands)}
              bedrockAgents={formData.bedrockAgents || []}
              onBedrockAgentsChange={(agents) => updateField('bedrockAgents', agents)}
              mcpServers={formData.mcpServers || []}
              tempMcpTools={tempMcpTools}
            />
          )}
        </div>
      )}

      <div
        className="flex justify-end pt-4 pb-4 space-x-2 border-t border-gray-200 dark:border-gray-700 mt-6 sticky bottom-0 bg-white dark:bg-gray-900"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onCancel()
          }}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800
            border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          onClick={(e) => {
            // ここではe.preventDefault()はしない（submit処理を許可するため）
            e.stopPropagation()
          }}
          disabled={isGenerating || isGeneratingScenarios}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-md shadow-sm focus:outline-none focus:ring-2
            focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 transition-all duration-200
            ${
              isGenerating || isGeneratingScenarios
                ? 'text-gray-400 dark:text-gray-500 bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 cursor-not-allowed opacity-70'
                : 'text-white bg-blue-600 dark:bg-blue-700 border-transparent hover:bg-blue-700 dark:hover:bg-blue-600'
            }`}
        >
          {isGenerating || isGeneratingScenarios ? (
            <>
              <svg
                className="w-4 h-4 mr-1 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <p>{t('generating')}...</p>
            </>
          ) : (
            <>
              <FiSave />
              <p>{t('save')}</p>
            </>
          )}
        </button>
      </div>
    </form>
  )
}
