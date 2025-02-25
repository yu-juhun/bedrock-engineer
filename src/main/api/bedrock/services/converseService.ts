import {
  ContentBlock,
  ConverseCommand,
  ConverseCommandOutput,
  ConverseStreamCommand,
  ConverseStreamCommandOutput,
  Message
} from '@aws-sdk/client-bedrock-runtime'
import { createRuntimeClient } from '../client'
import { processImageContent } from '../utils/imageUtils'
import type { CallConverseAPIProps, ServiceContext } from '../types'

// contentBlockのテキストフィールドが空でないことを確認する関数
function sanitizeContentBlocks(content: ContentBlock[] | any): ContentBlock[] | any {
  if (!Array.isArray(content)) {
    return content
  }

  return content.map((block) => {
    // テキストフィールドが空の場合、スペースを挿入する
    if (Object.prototype.hasOwnProperty.call(block, 'text') && block.text === '') {
      // スペース1文字をプレースホルダーとして設定
      block.text = ' '
    }
    return block
  })
}

// メッセージの各コンテンツブロックを処理する
function sanitizeMessages(messages: Message[]): Message[] {
  return messages.map((message) => {
    if (message.content) {
      message.content = sanitizeContentBlocks(message.content)
    }
    return message
  })
}

export class ConverseService {
  private static readonly MAX_RETRIES = 30
  private static readonly RETRY_DELAY = 5000
  constructor(private context: ServiceContext) {}

  async converse(props: CallConverseAPIProps, retries = 0): Promise<ConverseCommandOutput> {
    try {
      const { modelId, messages, system, toolConfig } = props

      // Process messages to ensure image data is in correct format
      const processedMessages = messages.map((msg) => ({
        ...msg,
        content: Array.isArray(msg.content) ? processImageContent(msg.content) : msg.content
      }))

      // Check for empty text fields before sanitization (debugging purposes)
      const hasEmptyTextFields = processedMessages.some(
        (msg) =>
          Array.isArray(msg.content) &&
          msg.content.some(
            (block) => Object.prototype.hasOwnProperty.call(block, 'text') && block.text === ''
          )
      )

      if (hasEmptyTextFields) {
        console.log('Found empty text fields in content blocks before sanitization')
      }

      // Sanitize messages to handle empty text fields
      const sanitizedMessages = sanitizeMessages(processedMessages)

      const { maxTokens, temperature, topP } = this.context.store.get('inferenceParams')
      const command = new ConverseCommand({
        modelId,
        messages: sanitizedMessages,
        system,
        toolConfig,
        inferenceConfig: { maxTokens, temperature, topP }
      })

      const runtimeClient = createRuntimeClient(this.context.store.get('aws'))
      return runtimeClient.send(command)
    } catch (error: any) {
      if (error.name === 'ThrottlingException' || error.name === 'ServiceUnavailableException') {
        console.log({ retry: retries, error, errorName: error.name })
        if (retries >= ConverseService.MAX_RETRIES) {
          throw error
        }
        await new Promise((resolve) => setTimeout(resolve, ConverseService.RETRY_DELAY))
        return this.converse(props, retries + 1)
      }
      console.log({ error })
      throw error
    }
  }

  async converseStream(
    props: CallConverseAPIProps,
    retries = 0
  ): Promise<ConverseStreamCommandOutput> {
    const runtimeClient = createRuntimeClient(this.context.store.get('aws'))

    try {
      const { modelId, messages, system, toolConfig } = props

      const processedMessages = messages.map((msg) => ({
        ...msg,
        content: Array.isArray(msg.content) ? processImageContent(msg.content) : msg.content
      }))

      // Check for empty text fields before sanitization (debugging purposes)
      const hasEmptyTextFields = processedMessages.some(
        (msg) =>
          Array.isArray(msg.content) &&
          msg.content.some(
            (block) => Object.prototype.hasOwnProperty.call(block, 'text') && block.text === ''
          )
      )

      if (hasEmptyTextFields) {
        console.log('Found empty text fields in content blocks before sanitization')
      }

      // Sanitize messages to handle empty text fields
      const sanitizedMessages = sanitizeMessages(processedMessages)

      const command = new ConverseStreamCommand({
        modelId,
        messages: sanitizedMessages,
        system,
        toolConfig,
        inferenceConfig: this.context.store.get('inferenceParams')
      })

      return await runtimeClient.send(command)
    } catch (error: any) {
      if (error.name === 'ThrottlingException' || error.name === 'ServiceUnavailableException') {
        console.log({ retry: retries, error, errorName: error.name })
        if (retries >= ConverseService.MAX_RETRIES) {
          throw error
        }
        await new Promise((resolve) => setTimeout(resolve, ConverseService.RETRY_DELAY))
        return this.converseStream(props, retries + 1)
      }
      console.log({ error })
      throw error
    }
  }
}
