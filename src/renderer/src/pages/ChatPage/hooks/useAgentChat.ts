import {
  ConversationRole,
  ContentBlock,
  Message,
  ToolUseBlockStart,
  ImageFormat
} from '@aws-sdk/client-bedrock-runtime'
import { StreamChatCompletionProps, streamChatCompletion } from '@renderer/lib/api'
import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { ToolState } from '@/types/agent-chat'
import { AttachedImage } from '../components/InputForm/TextArea'
import { ChatMessage } from '@/types/chat/history'
import { ToolName } from '@/types/tools'

// メッセージの送信時に、Trace を全て載せると InputToken が逼迫するので取り除く
function removeTraces(messages) {
  return messages.map((message) => {
    if (message.content && Array.isArray(message.content)) {
      return {
        ...message,
        content: message.content.map((item) => {
          if (item.toolResult) {
            return {
              ...item,
              toolResult: {
                ...item.toolResult,
                content: item.toolResult.content.map((c) => {
                  if (c?.json?.result?.completion) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { traces, ...restCompletion } = c.json.result.completion
                    return {
                      ...c,
                      json: {
                        ...c.json,
                        result: {
                          ...c.json.result,
                          completion: restCompletion
                        }
                      }
                    }
                  }
                  return c
                })
              }
            }
          }
          return item
        })
      }
    }
    return message
  })
}

export const useAgentChat = (
  modelId: string,
  systemPrompt?: string,
  enabledTools: ToolState[] = [],
  sessionId?: string,
  options?: { enableHistory?: boolean }
) => {
  const { enableHistory = true } = options || {} // デフォルトで履歴保存は有効

  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [executingTool, setExecutingTool] = useState<ToolName | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(sessionId)
  const [isSummarized, setIsSummarized] = useState(false) // 要約が使用されたかどうかのフラグ
  const [systemPromptToSend, setSystemPromptToSend] = useState(systemPrompt)
  const abortController = useRef<AbortController | null>(null)
  const { t } = useTranslation()

  // 通信を中断する関数
  const abortCurrentRequest = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort()
      abortController.current = null
    }
    setLoading(false)
  }, [])

  // セッションの初期化
  useEffect(() => {
    if (sessionId) {
      const session = window.chatHistory.getSession(sessionId)
      if (session) {
        // 既存の通信があれば中断
        abortCurrentRequest()
        setMessages(session.messages as Message[])
        setCurrentSessionId(sessionId)
      }
    } else if (enableHistory) {
      // 履歴保存が有効な場合のみ新しいセッションを作成
      // TODO: agentId によって履歴を復元できる機能は後日実装する
      const newSessionId = window.chatHistory.createSession('defaultAgent', modelId, systemPrompt)
      setCurrentSessionId(newSessionId)
    }
  }, [sessionId, enableHistory])

  // コンポーネントのアンマウント時にアクティブな通信を中断
  useEffect(() => {
    return () => {
      abortCurrentRequest()
    }
  }, [])

  // currentSessionId が変わった時の処理
  useEffect(() => {
    if (currentSessionId) {
      // セッション切り替え時に進行中の通信を中断
      abortCurrentRequest()
      const session = window.chatHistory.getSession(currentSessionId)
      if (session) {
        setMessages(session.messages as Message[])
        window.chatHistory.setActiveSession(currentSessionId)
      }
    }
  }, [currentSessionId])

  // メッセージの永続化を行うラッパー関数
  const persistMessage = useCallback(
    (message: Message) => {
      if (!enableHistory) return

      if (currentSessionId && message.role && message.content) {
        const chatMessage: ChatMessage = {
          id: `msg_${Date.now()}`,
          role: message.role,
          content: message.content,
          timestamp: Date.now(),
          metadata: {
            modelId,
            tools: enabledTools
          }
        }
        window.chatHistory.addMessage(currentSessionId, chatMessage)
      }
    },
    [currentSessionId, modelId, enabledTools, enableHistory]
  )

  // 注: トークン制限を考慮したメッセージ取得関数は、
  // streamChat内で直接実装するように変更したため削除

  const streamChat = async (props: StreamChatCompletionProps, currentMessages: Message[]) => {
    // 既存の通信があれば中断
    if (abortController.current) {
      abortController.current.abort()
    }

    // 新しい AbortController を作成
    abortController.current = new AbortController()

    // メッセージの最適化を試みる（長い会話の場合は要約を使用）
    let enhancedSystemPrompt = systemPrompt
    let optimizedMessages = currentMessages

    if (currentSessionId) {
      try {
        // 要約機能を使って最適化されたメッセージリストとシステムプロンプトを取得
        const {
          messages: optimized,
          systemPromptText,
          summarized
        } = window.chatHistory.getOptimizedMessages(currentSessionId)

        // 要約が使用されたかどうかのフラグを更新
        setIsSummarized(summarized)

        // 最適化されたメッセージとシステムプロンプトを使用
        if (optimized.length > 0 || systemPromptText) {
          optimizedMessages = optimized.length > 0 ? optimized : currentMessages
          enhancedSystemPrompt = systemPromptText || systemPrompt
        }
      } catch (error) {
        console.error('Error optimizing messages:', error)
      }
    }

    // 最適化されたメッセージをプロップスに設定
    props.messages = removeTraces(optimizedMessages)

    // 最適化されたシステムプロンプトを設定
    if (enhancedSystemPrompt) {
      setSystemPromptToSend(enhancedSystemPrompt)
      props.system = [{ text: enhancedSystemPrompt }]
    }

    const generator = streamChatCompletion(props, abortController.current.signal)

    let s = ''
    let input = ''
    let role: ConversationRole = 'assistant' // デフォルト値を設定
    let toolUse: ToolUseBlockStart | undefined = undefined
    const content: ContentBlock[] = []

    let messageStart = false
    try {
      for await (const json of generator) {
        if (json.messageStart) {
          role = json.messageStart.role ?? 'assistant' // デフォルト値を設定
          messageStart = true
        } else if (json.messageStop) {
          if (!messageStart) {
            // messageStartなしでmessageStopが来た場合は再試行
            if (process.env.NODE_ENV === 'development') {
              console.warn('messageStop without messageStart, retrying')
            }
            await streamChat(props, currentMessages)
            return
          }
          const newMessage = { role, content }
          setMessages([...currentMessages, newMessage])
          currentMessages.push(newMessage)
          persistMessage(newMessage)
          console.log(currentMessages)

          const stopReason = json.messageStop.stopReason
          return stopReason
        } else if (json.contentBlockStart) {
          toolUse = json.contentBlockStart.start?.toolUse
        } else if (json.contentBlockStop) {
          if (toolUse) {
            let parseInput: string
            try {
              parseInput = JSON.parse(input)
            } catch (e) {
              parseInput = input
            }

            content.push({
              toolUse: { name: toolUse?.name, toolUseId: toolUse?.toolUseId, input: parseInput }
            })
          } else {
            content.push({ text: s })
          }
          input = ''
        } else if (json.contentBlockDelta) {
          const text = json.contentBlockDelta.delta?.text
          if (text) {
            s = s + text
            setMessages([...currentMessages, { role, content: [{ text: s }] }])
          }

          if (toolUse) {
            input = input + json.contentBlockDelta.delta?.toolUse?.input

            setMessages([
              ...currentMessages,
              {
                role,
                content: [
                  { text: s },
                  {
                    toolUse: { name: toolUse?.name, toolUseId: toolUse?.toolUseId, input: input }
                  }
                ]
              }
            ])
          }
        } else {
          console.error('unexpected json:', json)
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // 中断は正常な操作なのでエラーとして扱わない
        return
      }
      // もし要約使用時にエラーが発生し、かつそれがトークン制限に関連するエラーなら、要約なしで再試行
      if (isSummarized && error.message?.includes('exceed context limit')) {
        console.warn('Error with summarized context, trying without summarization')
        // 要約を使わずに元のメッセージと元のシステムプロンプトを使用
        props.messages = removeTraces(currentMessages)
        props.system = systemPrompt ? [{ text: systemPrompt }] : undefined
        setIsSummarized(false)
        return await streamChat(props, currentMessages)
      }
      console.error({ streamChatRequestError: error })
      toast.error(t('request error'))
      const errorMessage = {
        role: 'assistant' as const,
        content: [{ text: error.message }]
      }
      setMessages([...currentMessages, errorMessage])
      persistMessage(errorMessage)
      throw error
    } finally {
      // 使用済みの AbortController をクリア
      if (abortController.current?.signal.aborted) {
        abortController.current = null
      }
    }
    throw new Error('unexpected end of stream')
  }

  const recursivelyExecTool = async (contentBlocks: ContentBlock[], currentMessages: Message[]) => {
    const contentBlock = contentBlocks.find((block) => block.toolUse)
    if (!contentBlock) {
      return
    }

    const toolResults: ContentBlock[] = []
    for (const contentBlock of contentBlocks) {
      if (Object.keys(contentBlock).includes('toolUse')) {
        const toolUse = contentBlock.toolUse
        if (toolUse?.name) {
          try {
            const toolInput = {
              type: toolUse.name,
              ...(toolUse.input as any)
            }
            setExecutingTool(toolInput.type)
            const toolResult = await window.api.bedrock.executeTool(toolInput)
            setExecutingTool(null)
            if (Object.prototype.hasOwnProperty.call(toolResult, 'name')) {
              toolResults.push({
                toolResult: {
                  toolUseId: toolUse.toolUseId,
                  content: [{ json: toolResult }],
                  status: 'success'
                }
              })
            } else {
              toolResults.push({
                toolResult: {
                  toolUseId: toolUse.toolUseId,
                  content: [{ text: toolResult }],
                  status: 'success'
                }
              })
            }
          } catch (e: any) {
            console.error(e)
            toolResults.push({
              toolResult: {
                toolUseId: toolUse.toolUseId,
                content: [{ text: e.toString() }],
                status: 'error'
              }
            })
          }
        }
      }
    }

    const toolResultMessage: Message = {
      role: 'user',
      content: toolResults
    }
    currentMessages.push(toolResultMessage)
    setMessages((prev) => [...prev, toolResultMessage])
    persistMessage(toolResultMessage)

    const stopReason = await streamChat(
      {
        messages: currentMessages,
        modelId,
        system: systemPromptToSend ? [{ text: systemPromptToSend }] : undefined,
        toolConfig: enabledTools.length ? { tools: enabledTools } : undefined
      },
      currentMessages
    )

    if (stopReason === 'tool_use') {
      const lastMessage = currentMessages[currentMessages.length - 1].content
      if (lastMessage) {
        await recursivelyExecTool(lastMessage, currentMessages)
        return
      }
    }
  }

  const handleSubmit = async (userInput: string, attachedImages?: AttachedImage[]) => {
    if (!userInput && (!attachedImages || attachedImages.length === 0)) {
      return toast.error('Please enter a message or attach images')
    }

    if (!modelId) {
      return toast.error('Please select a model')
    }

    let result
    try {
      setLoading(true)
      const currentMessages = [...messages]

      const imageContents: any =
        attachedImages?.map((image) => ({
          image: {
            format: image.file.type.split('/')[1] as ImageFormat,
            source: {
              bytes: image.base64
            }
          }
        })) ?? []

      const content =
        imageContents.length > 0 ? [...imageContents, { text: userInput }] : [{ text: userInput }]
      const userMessage: Message = {
        role: 'user',
        content
      }

      currentMessages.push(userMessage)
      setMessages((prev) => [...prev, userMessage])
      persistMessage(userMessage)

      await streamChat(
        {
          messages: currentMessages,
          modelId,
          system: systemPrompt ? [{ text: systemPrompt }] : undefined,
          toolConfig: enabledTools.length ? { tools: enabledTools } : undefined
        },
        currentMessages
      )

      const lastMessage = currentMessages[currentMessages.length - 1]
      if (lastMessage.content?.find((v) => v.toolUse)) {
        if (!lastMessage.content) {
          // コンテンツがない場合はツール実行をスキップ
          if (process.env.NODE_ENV === 'development') {
            console.warn('Message has toolUse but no content')
          }
          result = null
        } else {
          result = await recursivelyExecTool(lastMessage.content, currentMessages)
        }
      }
    } catch (error: any) {
      console.error('Error in handleSubmit:', error)
      toast.error(error.message || 'An error occurred')
    } finally {
      setLoading(false)
      setExecutingTool(null)
    }
    return result
  }

  // チャットをクリアする機能
  const clearChat = useCallback(() => {
    // 進行中の通信を中断
    abortCurrentRequest()

    // 新しいセッションを作成
    const newSessionId = window.chatHistory.createSession('defaultAgent', modelId, systemPrompt)
    setCurrentSessionId(newSessionId)

    // メッセージをクリア
    setMessages([])
    // 要約フラグもリセット
    setIsSummarized(false)
  }, [modelId, systemPrompt, abortCurrentRequest])

  const setSession = useCallback(
    (newSessionId: string) => {
      // 進行中の通信を中断してから新しいセッションを設定
      abortCurrentRequest()
      setCurrentSessionId(newSessionId)
      // 新しいセッションに切り替えるときは要約フラグをリセット
      setIsSummarized(false)
    },
    [abortCurrentRequest]
  )

  return {
    messages,
    loading,
    executingTool,
    handleSubmit,
    setMessages,
    currentSessionId,
    setCurrentSessionId: setSession, // 中断処理付きのセッション切り替え関数を返す
    clearChat,
    isSummarized // 要約が使用されたかどうかがわかるフラグを返す
  }
}
