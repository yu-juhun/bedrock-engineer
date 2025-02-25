import { Message } from '@aws-sdk/client-bedrock-runtime'

export type CallConverseAPIProps = {
  modelId: string
  messages: Message[]
  system: [{ text: string }]
  toolConfig?: any
}

export type AWSCredentials = {
  region: string
  accessKeyId: string
  secretAccessKey: string
}

export type ReasoningEffort = 'low' | 'medium' | 'high'

export type InferenceParams = {
  maxTokens: number
  temperature: number
  topP: number
  thinking?: {
    enabled: boolean
    budgetTokens: number
    reasoningEffort?: ReasoningEffort
  }
}

export interface Store {
  get(key: 'aws'): AWSCredentials
  get(key: 'inferenceParams'): InferenceParams
  get(key: string): any
}

export type ServiceContext = {
  store: Store
}
