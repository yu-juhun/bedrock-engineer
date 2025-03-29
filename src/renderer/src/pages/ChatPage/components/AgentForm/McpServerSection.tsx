import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { McpServerConfig } from '@/types/agent-chat'
import toast from 'react-hot-toast'
import { FiEdit, FiTrash2, FiZap } from 'react-icons/fi'

interface McpServerSectionProps {
  mcpServers: McpServerConfig[]
  onChange: (mcpServers: McpServerConfig[]) => void
}

export const McpServerSection: React.FC<McpServerSectionProps> = ({ mcpServers, onChange }) => {
  const { t } = useTranslation()
  const [jsonInput, setJsonInput] = useState<string>('')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState<string | null>(null)

  // 接続テスト用の状態
  const [testingConnection, setTestingConnection] = useState<string | null>(null)
  const [testingAll, setTestingAll] = useState(false)
  const [connectionResults, setConnectionResults] = useState<
    Record<
      string,
      {
        success: boolean
        message: string
        testedAt: number
        details?: {
          toolCount?: number
          toolNames?: string[]
          error?: string
          errorDetails?: string
          startupTime?: number
        }
      }
    >
  >({})

  // 新しいサーバーの追加後に自動テストするかどうか
  const [autoTestOnAdd] = useState(true)

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

  /**
   * 単一のMCPサーバーに対して接続テストを実行
   */
  const testServerConnection = async (serverName: string, serverList = mcpServers) => {
    const serverConfig = serverList.find((server) => server.name === serverName)
    if (!serverConfig) {
      toast.error(`Server "${serverName}" not found`)
      return
    }

    setTestingConnection(serverName)

    try {
      const result = await window.api.mcp.testConnection(serverConfig)

      // 結果を保存
      setConnectionResults((prev) => ({
        ...prev,
        [serverName]: {
          ...result,
          testedAt: Date.now()
        }
      }))

      // 簡易なトースト通知
      if (result.success) {
        toast.success(`${result.message}`)
      } else {
        toast.error(`${result.message}`)
      }
    } catch (error) {
      console.error(`Error testing connection to ${serverName}:`, error)
      toast.error(`Error testing connection to ${serverName}`)
    } finally {
      setTestingConnection(null)
    }
  }

  /**
   * すべてのMCPサーバーに対して接続テストを実行（直列処理）
   */
  const testAllConnections = async () => {
    if (mcpServers.length === 0) {
      toast(`No MCP servers configured`)
      return
    }

    setTestingAll(true)

    try {
      const startTime = Date.now()
      toast(`Testing ${mcpServers.length} MCP servers...`)

      // 各サーバーを順番にテスト
      for (const server of mcpServers) {
        await testServerConnection(server.name)
      }

      const totalTime = Date.now() - startTime
      toast.success(`Completed testing ${mcpServers.length} servers in ${totalTime}ms`)
    } catch (error) {
      console.error('Error testing all connections:', error)
      toast.error(`Failed to test all connections: ${error}`)
    } finally {
      setTestingAll(false)
    }
  }

  // 追加ボタンクリック時に入力されたJSONを解析して追加
  const handleAddServer = async () => {
    try {
      // JSONパース
      const parsedConfig = JSON.parse(jsonInput)
      let updatedServers = [...mcpServers]
      let newlyAddedServer: McpServerConfig | null = null

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
          const newServer = {
            name,
            description: name, // デフォルトでは名前と同じ
            command: serverConfig.command,
            args: serverConfig.args,
            env: serverConfig.env || {}
          }

          newServers.push(newServer)

          // 最後に追加したサーバーを記録（接続テスト用）
          if (!newlyAddedServer) {
            newlyAddedServer = newServer
          }
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
        updatedServers = [...mcpServers, ...newServers]
        onChange(updatedServers)

        // 入力欄をクリア
        setJsonInput('')
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
        updatedServers = [...mcpServers, serverConfig]
        onChange(updatedServers)
        newlyAddedServer = serverConfig

        // 入力欄をクリア
        setJsonInput('')
        setJsonError(null)
      }

      // 自動接続テストが有効で、新しいサーバーが追加された場合はテスト実行
      if (autoTestOnAdd && newlyAddedServer) {
        // 少し待ってからテストを実行（UIの更新が完了するのを待つ）
        setTimeout(() => {
          testServerConnection(newlyAddedServer!.name, updatedServers)
        }, 500)
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
      setJsonInput('')
      setJsonError(null)
    } catch (error) {
      setJsonError(t('Invalid JSON format.'))
    }
  }

  // 編集キャンセル
  const handleCancelEdit = () => {
    setEditMode(null)
    setJsonInput('')
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
          {t(
            'Register MCP servers first, then you can enable MCP tools in the Available Tools tab.'
          )}
        </p>
      </div>

      {/* MCP Server リスト */}
      {mcpServers.length > 0 ? (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-sm">{t('Registered MCP Servers')}</h4>

            {/* 全サーバーテストボタン - 新規追加 */}
            {mcpServers.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  testAllConnections()
                }}
                disabled={testingAll || testingConnection !== null}
                className="text-xs px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 flex items-center gap-1 disabled:opacity-50 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/40"
              >
                {testingAll ? (
                  <div className="w-3 h-3 border-2 border-t-transparent border-blue-500 rounded-full animate-spin mr-1"></div>
                ) : (
                  <FiZap className="w-3 h-3 mr-1" />
                )}
                {testingAll ? t('Testing...') : t('Test All Servers')}
              </button>
            )}
          </div>

          {/* テスト結果の概要ステータスを表示 */}
          {mcpServers.length > 0 && Object.keys(connectionResults).length > 0 && (
            <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded mb-2 flex items-center justify-between">
              <div className="text-xs">
                <span className="font-medium">{t('Connection Status')}:</span>{' '}
                {(() => {
                  const total = Object.keys(connectionResults).length
                  const success = Object.values(connectionResults).filter((r) => r.success).length
                  return (
                    <>
                      <span className="text-green-600 dark:text-green-400">
                        {success} {t('success')}
                      </span>
                      {total - success > 0 && (
                        <>
                          {' / '}
                          <span className="text-red-600 dark:text-red-400">
                            {total - success} {t('failed')}
                          </span>
                        </>
                      )}
                      {' / '}
                      <span>
                        {mcpServers.length} {t('total')}
                      </span>
                    </>
                  )
                })()}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setConnectionResults({})
                }}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                {t('Clear Results')}
              </button>
            </div>
          )}

          <div className="border border-gray-200 dark:border-gray-700 rounded-md divide-y divide-gray-200 dark:divide-gray-700">
            {mcpServers.map((server) => (
              <div
                key={server.name}
                className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={preventCloseHandler}
              >
                {/* サーバー情報表示 */}
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-medium text-sm flex items-center">
                      {server.name}
                      {testingConnection === server.name && (
                        <div className="ml-2 w-3 h-3 border-2 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
                      )}
                    </h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{server.description}</p>
                    <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-1">
                      <code>
                        {server.command} {server.args.join(' ')}
                      </code>
                    </p>

                    {/* 接続テスト結果表示 - 詳細表示 */}
                    {connectionResults[server.name] && (
                      <div
                        className={`mt-2 p-2 rounded text-xs ${
                          connectionResults[server.name].success
                            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                        }`}
                      >
                        <div
                          className={`font-medium mb-1 flex items-center ${
                            connectionResults[server.name].success
                              ? 'text-green-700 dark:text-green-400'
                              : 'text-red-700 dark:text-red-400'
                          }`}
                        >
                          <span
                            className={`inline-block w-2 h-2 mr-1 rounded-full ${
                              connectionResults[server.name].success ? 'bg-green-500' : 'bg-red-500'
                            }`}
                          ></span>
                          {connectionResults[server.name].success
                            ? t('Connection Successful')
                            : t('Connection Failed')}
                          <span className="ml-2 font-normal text-gray-500">
                            {new Date(connectionResults[server.name].testedAt).toLocaleTimeString()}
                          </span>
                        </div>

                        {connectionResults[server.name].success ? (
                          // 成功時の詳細表示
                          <div>
                            <div className="text-green-700 dark:text-green-400">
                              {connectionResults[server.name].details?.toolCount || 0}{' '}
                              {t('tools available')}
                            </div>
                            {connectionResults[server.name].details?.startupTime !== undefined && (
                              <div className="text-gray-600 dark:text-gray-400 mt-1">
                                {t('Startup time')}:{' '}
                                {connectionResults[server.name].details?.startupTime}ms
                              </div>
                            )}
                          </div>
                        ) : (
                          // 失敗時の詳細表示
                          <div>
                            <div className="text-red-700 dark:text-red-400">
                              {connectionResults[server.name].details?.error}
                            </div>
                            {connectionResults[server.name].details?.errorDetails && (
                              <div className="mt-1 text-gray-700 dark:text-gray-300 p-1 bg-gray-100 dark:bg-gray-800 rounded">
                                <strong>{t('Solution')}:</strong>{' '}
                                {connectionResults[server.name].details?.errorDetails}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* アクションボタン */}
                  <div className="flex space-x-2">
                    {/* テストボタン - 新規追加 */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        testServerConnection(server.name)
                      }}
                      disabled={testingConnection !== null || testingAll}
                      className="p-1 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400"
                      title={t('Test Connection')}
                    >
                      <FiZap size={18} />
                    </button>

                    {/* 既存の編集・削除ボタン */}
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
                setJsonInput(`{
  "mcpServers": {
    "fetch": {
      "command": "uvx",
      "args": ["mcp-server-fetch"]
    }
  }
}
`)
              }}
            >
              {t('Set example mcp server')}
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
