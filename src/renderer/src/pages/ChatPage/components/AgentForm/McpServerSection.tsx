import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { McpServerConfig } from '@/types/agent-chat'
import toast from 'react-hot-toast'
import { FiEdit, FiTrash2 } from 'react-icons/fi'

interface McpServerSectionProps {
  mcpServers: McpServerConfig[]
  onChange: (mcpServers: McpServerConfig[]) => void
}

export const McpServerSection: React.FC<McpServerSectionProps> = ({ mcpServers, onChange }) => {
  const { t } = useTranslation()
  const [jsonInput, setJsonInput] = useState<string>('')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState<string | null>(null)

  // JSON入力欄の初期値を設定（常にclaude_desktop_config.json形式）
  const getInitialJson = () => {
    const sampleConfig = {
      mcpServers: {
        fetch: {
          command: 'uvx',
          args: ['mcp-server-fetch']
        }
      }
    }
    return JSON.stringify(sampleConfig, null, 2)
  }

  React.useEffect(() => {
    setJsonInput(getInitialJson())
  }, [])

  // 編集モードに切り替え
  const handleEdit = (serverName: string) => {
    const serverToEdit = mcpServers.find((server) => server.name === serverName)
    if (serverToEdit) {
      const serverConfig = {
        name: serverToEdit.name,
        description: serverToEdit.description,
        command: serverToEdit.command,
        args: serverToEdit.args,
        env: serverToEdit.env || {}
      }
      setJsonInput(JSON.stringify(serverConfig, null, 2))
      setEditMode(serverName)
    }
  }

  // サーバー削除
  const handleDelete = (serverName: string) => {
    onChange(mcpServers.filter((server) => server.name !== serverName))
  }

  // 追加ボタンクリック時に入力されたJSONを解析して追加
  const handleAddServer = () => {
    try {
      // JSONパース
      const parsedConfig = JSON.parse(jsonInput)

      // claude_desktop_config.json互換形式かどうかをチェック
      if (parsedConfig.mcpServers && typeof parsedConfig.mcpServers === 'object') {
        // 複数サーバー形式の場合の処理
        const newServers: McpServerConfig[] = []
        const existingNames = mcpServers.map((server) => server.name)
        const errorMessages: string[] = []

        // 各サーバー設定を検証してリストに追加
        Object.entries(parsedConfig.mcpServers).forEach(([name, config]) => {
          const serverConfig = config as any

          // 必須フィールドの検証
          if (!serverConfig.command || !Array.isArray(serverConfig.args)) {
            errorMessages.push(`Server "${name}": missing required fields`)
            return
          }

          // envが指定されている場合はオブジェクト型であることを確認
          if (serverConfig.env && typeof serverConfig.env !== 'object') {
            errorMessages.push(`Server "${name}": "env" field must be an object`)
            return
          }

          // 既存のサーバー名との重複チェック
          if (existingNames.includes(name)) {
            errorMessages.push(`Server "${name}" already exists`)
            return
          }

          // この形式では名前はキー、説明がない場合は名前を使用
          newServers.push({
            name,
            description: name, // デフォルトでは名前と同じ
            command: serverConfig.command,
            args: serverConfig.args,
            env: serverConfig.env || {}
          })
        })

        if (errorMessages.length > 0) {
          setJsonError(`Some servers could not be added: \n${errorMessages.join('\n')}`)
          return
        }

        if (newServers.length === 0) {
          setJsonError(t('No valid server configurations found'))
          return
        }

        // サーバー設定を追加
        onChange([...mcpServers, ...newServers])

        // 入力欄をクリア
        setJsonInput(getInitialJson())
        setJsonError(null)

        // 成功メッセージ
        toast.success(`${newServers.length} MCP server(s) added successfully`, {
          duration: 3000
        })
      } else {
        // 従来の単一サーバー形式の処理
        const serverConfig = parsedConfig

        // 必須フィールドの検証
        if (
          !serverConfig.name ||
          !serverConfig.description ||
          !serverConfig.command ||
          !Array.isArray(serverConfig.args)
        ) {
          setJsonError(t('Required fields are missing or invalid. Check the JSON format.'))
          return
        }

        // envが指定されている場合はオブジェクト型であることを確認
        if (serverConfig.env && typeof serverConfig.env !== 'object') {
          setJsonError(t('The "env" field must be an object.'))
          return
        }

        // 既存のサーバー名との重複チェック
        if (mcpServers.some((server) => server.name === serverConfig.name)) {
          setJsonError(t('A server with this name already exists.'))
          return
        }

        // サーバー設定を追加
        onChange([...mcpServers, serverConfig])

        // 入力欄をクリア
        setJsonInput(getInitialJson())
        setJsonError(null)
      }
    } catch (error) {
      setJsonError(t('Invalid JSON format.'))
    }
  }

  // 編集内容保存
  const handleSaveEdit = () => {
    try {
      // JSONパース
      const serverConfig = JSON.parse(jsonInput)

      // 必須フィールドの検証
      if (
        !serverConfig.name ||
        !serverConfig.description ||
        !serverConfig.command ||
        !Array.isArray(serverConfig.args)
      ) {
        setJsonError(t('Required fields are missing or invalid. Check the JSON format.'))
        return
      }

      // envが指定されている場合はオブジェクト型であることを確認
      if (serverConfig.env && typeof serverConfig.env !== 'object') {
        setJsonError(t('The "env" field must be an object.'))
        return
      }

      // 名前が変更された場合の処理
      const newName = serverConfig.name
      if (newName !== editMode && mcpServers.some((server) => server.name === newName)) {
        setJsonError(t('A server with this new name already exists.'))
        return
      }

      // 新しい設定オブジェクトを作成
      const updatedServer: McpServerConfig = {
        name: newName,
        description: serverConfig.description || newName, // 説明がなければ名前を使用
        command: serverConfig.command,
        args: serverConfig.args,
        env: serverConfig.env || {}
      }

      // サーバー設定を更新
      onChange(mcpServers.map((server) => (server.name === editMode ? updatedServer : server)))

      // 編集モード終了
      setEditMode(null)
      setJsonInput(getInitialJson())
      setJsonError(null)
    } catch (error) {
      setJsonError(t('Invalid JSON format.'))
    }
  }

  // 編集キャンセル
  const handleCancelEdit = () => {
    setEditMode(null)
    setJsonInput(getInitialJson())
    setJsonError(null)
  }

  // モーダルを閉じないようにするための共通のイベントハンドラ
  const preventCloseHandler = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <div className="space-y-4" onClick={preventCloseHandler}>
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">
        {t('MCP Server Settings')}
      </h3>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md mb-4">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {t('Configure MCP servers for this agent to use MCP tools.')}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          {t('Register MCP servers first, then you can enable MCP tools in the Tools tab.')}
        </p>
      </div>

      {/* MCP Server リスト */}
      {mcpServers.length > 0 ? (
        <div className="space-y-2">
          <h4 className="font-medium text-sm">{t('Registered MCP Servers')}</h4>
          <div className="border border-gray-200 dark:border-gray-700 rounded-md divide-y divide-gray-200 dark:divide-gray-700">
            {mcpServers.map((server) => (
              <div
                key={server.name}
                className="p-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={preventCloseHandler}
              >
                <div>
                  <h5 className="font-medium text-sm">{server.name}</h5>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{server.description}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <code>
                      {server.command} {server.args.join(' ')}
                    </code>
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleEdit(server.name)
                    }}
                    className="p-1 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400"
                  >
                    <FiEdit size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleDelete(server.name)
                    }}
                    className="p-1 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center p-4 border border-gray-200 dark:border-gray-700 rounded-md">
          <p className="text-gray-500 dark:text-gray-400">{t('No MCP servers configured yet')}</p>
        </div>
      )}

      {/* MCP Server 追加/編集フォーム */}
      <div
        className="flex flex-col gap-2 mt-4 border border-gray-200 dark:border-gray-700 p-4 rounded-md"
        onClick={preventCloseHandler}
      >
        <h4 className="font-medium text-sm mb-2">
          {editMode ? t('Edit MCP Server') : t('Add New MCP Server')}
        </h4>

        <div className="mt-2">
          <div className="flex justify-between items-center">
            <label
              htmlFor="jsonInput"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {t('Server Configuration (JSON)')}
            </label>
            <button
              type="button"
              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setJsonInput(getInitialJson())
              }}
            >
              {t('Reset to Example')}
            </button>
          </div>
          <textarea
            id="jsonInput"
            value={jsonInput}
            onChange={(e) => {
              setJsonInput(e.target.value)
              if (jsonError) setJsonError(null)
            }}
            onClick={preventCloseHandler}
            className="mt-1 block w-full h-64 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"
            placeholder={`{
  "mcpServers": {
    "my-mcp-server": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/directory"],
      "env": { "VAR": "value" }
    }
  }
}`}
          />
          {jsonError && (
            <p className="text-xs text-red-500 mt-1 whitespace-pre-line">{jsonError}</p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t(
              'Use claude_desktop_config.json format with mcpServers object containing server configurations.'
            )}
          </p>
        </div>

        <div className="flex gap-2">
          {editMode ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleCancelEdit()
                }}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {t('Cancel')}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleSaveEdit()
                }}
                className="px-4 py-1.5 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {t('Update Server')}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleAddServer()
              }}
              className="px-4 py-1.5 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed mt-2 w-fit"
            >
              {t('Add Server')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
