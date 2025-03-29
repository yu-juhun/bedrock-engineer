import { z } from 'zod'
import { MCPClient } from './mcp-client'
import { Tool } from '@aws-sdk/client-bedrock-runtime'
import { McpServerConfig } from '../../types/agent-chat'

const configSchema = z.object({
  mcpServers: z.record(
    z.string(),
    z.object({
      command: z.string(),
      args: z.array(z.string()),
      env: z.record(z.string(), z.string()).optional()
    })
  )
})

let clients: { name: string; client: MCPClient }[] = []

// キャッシュ用の変数
let lastMcpServerConfigHash: string | null = null
let lastMcpServerLength: number = 0
let lastMcpServerNames: string[] = []
let initializationInProgress: Promise<void> | null = null

/**
 * サーバー設定の安定した比較用のハッシュ値を生成する
 * 構成の本質的な部分のみを考慮し、不要な変動要素を除外する
 */
const generateConfigHash = (servers: McpServerConfig[]): string => {
  if (!servers || servers.length === 0) {
    return 'empty'
  }

  // 名前で並べ替えて安定した順序にする
  const sortedServers = [...servers].sort((a, b) => a.name.localeCompare(b.name))

  // 本質的な設定のみを含むオブジェクトの配列を作成
  const essentialConfigs = sortedServers.map((server) => ({
    name: server.name,
    command: server.command,
    args: [...server.args], // 配列のコピーを作成して安定させる
    // 環境変数がある場合のみ含める
    ...(server.env && Object.keys(server.env).length > 0 ? { env: { ...server.env } } : {})
  }))

  return JSON.stringify(essentialConfigs)
}

/**
 * サーバー設定が実質的に変更されたかどうかをチェック
 * 名前のリストと設定ハッシュの両方を確認
 */
const hasConfigChanged = (servers: McpServerConfig[] = []): boolean => {
  // サーバー数が変わった場合は明らかに変更
  if (servers.length !== lastMcpServerLength) {
    console.log(`MCP server count changed: ${lastMcpServerLength} -> ${servers.length}`)
    return true
  }

  // 空のリストなら変更なしと見なす
  if (servers.length === 0 && lastMcpServerLength === 0) {
    return false
  }

  // サーバー名のリストを作成して比較
  const currentNames = servers.map((s) => s.name).sort()
  const sameNames =
    currentNames.length === lastMcpServerNames.length &&
    currentNames.every((name, i) => name === lastMcpServerNames[i])

  if (!sameNames) {
    console.log(`MCP server names changed`)
    return true
  }

  // 詳細な設定内容のハッシュを比較
  const configHash = generateConfigHash(servers)
  return configHash !== lastMcpServerConfigHash
}

/**
 * 現在の設定情報をキャッシュに保存
 */
const updateConfigCache = (servers: McpServerConfig[] = []): void => {
  lastMcpServerConfigHash = generateConfigHash(servers)
  lastMcpServerLength = servers.length
  lastMcpServerNames = servers.map((s) => s.name).sort()
  console.log(`Updated MCP config cache with ${servers.length} server(s)`)
}

// エージェントからMCPサーバー設定を受け取る関数
export const initMcpFromAgentConfig = async (mcpServers: McpServerConfig[] = []) => {
  // 明示的なデバッグ情報の表示
  console.log(`initMcpFromAgentConfig called with ${mcpServers.length} server(s)`)

  // 変更があるかどうか確認
  if (!hasConfigChanged(mcpServers)) {
    console.log('MCP configuration unchanged, skipping initialization')
    return
  }

  // 初期化が進行中なら待機
  if (initializationInProgress) {
    console.log('MCP initialization already in progress, waiting...')
    try {
      await initializationInProgress
      console.log('Finished waiting for previous MCP initialization')

      // 待機中に他のプロセスが同じ構成で初期化を完了した場合はスキップ
      if (!hasConfigChanged(mcpServers)) {
        console.log('MCP already initialized with same configuration during wait')
        return
      }
    } catch (error) {
      console.log('Previous MCP initialization failed:', error)
      // エラーがあっても継続して新しい初期化を開始
    }
  }

  console.log(`Starting MCP initialization with ${mcpServers.length} server(s)...`)

  // 初期化処理を開始
  try {
    initializationInProgress = (async () => {
      // 既存のクライアントをクリーンアップ
      console.log(`Cleaning up ${clients.length} existing MCP clients...`)
      await Promise.all(
        clients.map(async ({ client }) => {
          try {
            await client.cleanup()
          } catch (e) {
            console.log(`Failed to clean up MCP client: ${e}`)
          }
        })
      )
      clients = []

      // 新しいクライアントを作成
      if (mcpServers.length === 0) {
        console.log('No MCP servers configured for this agent')
        updateConfigCache(mcpServers)
        return
      }

      // McpServerConfig[] 形式から configSchema 用のフォーマットに変換
      const configData = {
        mcpServers: mcpServers.reduce(
          (acc, server) => {
            acc[server.name] = {
              command: server.command,
              args: server.args,
              env: server.env || {}
            }
            return acc
          },
          {} as Record<string, { command: string; args: string[]; env?: Record<string, string> }>
        )
      }

      // configSchema によるバリデーション
      const { success, error } = configSchema.safeParse(configData)
      if (!success) {
        console.error('Invalid MCP server configuration:', error)
        throw new Error('Invalid MCP server configuration')
      }

      console.log(`Creating ${mcpServers.length} new MCP clients...`)
      clients = (
        await Promise.all(
          mcpServers.map(async (serverConfig) => {
            try {
              console.log(`Starting MCP server: ${serverConfig.name}`)
              const client = await MCPClient.fromCommand(
                serverConfig.command,
                serverConfig.args,
                serverConfig.env
              )
              return { name: serverConfig.name, client }
            } catch (e) {
              console.log(
                `MCP server ${serverConfig.name} failed to start: ${e}. Ignoring the server...`
              )
              return undefined
            }
          })
        )
      ).filter((c): c is { name: string; client: MCPClient } => c != null)

      // 初期化が完了したら構成ハッシュを更新
      updateConfigCache(mcpServers)
      console.log(`MCP initialization complete with ${clients.length} server(s)`)
    })()

    await initializationInProgress
  } catch (error) {
    console.error('Error during MCP initialization:', error)
    // エラーが発生した場合はキャッシュをクリアして次回再試行できるようにする
    lastMcpServerConfigHash = null
    lastMcpServerLength = 0
    lastMcpServerNames = []
    throw error
  } finally {
    initializationInProgress = null
  }
}

// デフォルト設定は必要なくなりました
// デフォルト設定を使用する関数は削除

export const getMcpToolSpecs = async (mcpServers?: McpServerConfig[]): Promise<Tool[]> => {
  // MCPサーバー設定がない場合は空配列を返す
  if (!mcpServers || mcpServers.length === 0) {
    return []
  }

  // エージェント固有のMCPサーバー設定を使用する
  await initMcpFromAgentConfig(mcpServers)

  return clients.flatMap(({ client }) => {
    // ツールに接頭辞を付けて返す（名前の衝突を避けるため）
    return client.tools.map((tool) => {
      // ディープコピーして元のオブジェクトを変更しないようにする
      const clonedTool = JSON.parse(JSON.stringify(tool))
      if (clonedTool.toolSpec?.name) {
        clonedTool.toolSpec.name = `mcp_${clonedTool.toolSpec.name}`
      }
      return clonedTool
    })
  })
}

export const tryExecuteMcpTool = async (
  toolName: string,
  input: any,
  mcpServers?: McpServerConfig[]
) => {
  // MCPサーバー設定がない場合はツールが見つからない旨を返す
  if (!mcpServers || mcpServers.length === 0) {
    return {
      found: false,
      success: false,
      name: `mcp_${toolName}`,
      error: `No MCP servers configured`,
      message: `This agent does not have any MCP servers configured. Please add MCP server configuration in agent settings.`,
      result: null
    }
  }

  // エージェント固有のMCPサーバー設定を使用する
  await initMcpFromAgentConfig(mcpServers)

  // ここでは素のツール名（mcp_ プレフィックスなし）を使用
  const client = clients.find(({ client }) =>
    client.tools.find((tool) => tool.toolSpec?.name == toolName)
  )
  if (client == null) {
    return {
      found: false,
      success: false,
      name: `mcp_${toolName}`,
      error: `MCP tool ${toolName} not found`,
      message: `No MCP server provides a tool named "${toolName}"`,
      result: null
    }
  }

  try {
    // inputの型からmcp_ プレフィックスを取り除いたツール名を使用
    const params = { ...input }
    const res = await client.client.callTool(toolName, params)

    return {
      found: true,
      success: true,
      name: `mcp_${toolName}`,
      message: 'MCP tool execution successful',
      result: res
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    return {
      found: true,
      success: false,
      name: `mcp_${toolName}`,
      error: errorMessage,
      message: `Error executing MCP tool "${toolName}": ${errorMessage}`,
      result: null
    }
  }
}
