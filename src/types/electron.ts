import { Tool } from '@aws-sdk/client-bedrock-runtime'
import { ElectronAPI } from '@electron-toolkit/preload'
import { chatHistory } from '../preload/chat-history'
import { ConfigStore } from '../preload/store'
import { file } from '../preload/file'
import { API } from '../preload/api'
import { RendererLogger, RendererCategoryLogger } from '../preload/logger'

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
    store: ConfigStore
    file: typeof file
    tools: Tool[]
    chatHistory: typeof chatHistory
    appWindow: {
      isFocused: () => Promise<boolean>
    }
    logger: {
      log: RendererLogger
      createCategoryLogger: (category: string) => RendererCategoryLogger
    }
  }
}
