// Define supported regions as a const array for better type inference
export const BEDROCK_SUPPORTED_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-2',
  'eu-central-1',
  'eu-west-1',
  'eu-west-3',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-south-1',
  'ap-southeast-1',
  'ap-southeast-2'
] as const

// Create a union type from the array
export type BedrockSupportRegion = (typeof BEDROCK_SUPPORTED_REGIONS)[number]

// Enhanced LLM interface with additional type safety
export interface LLM {
  readonly modelId: string // Make it readonly for immutability
  readonly modelName: string
  readonly toolUse: boolean
  readonly regions: readonly BedrockSupportRegion[] // Use the specific region type
  readonly maxTokensLimit?: number // Optional parameter for model-specific limits
}

// Type guard for LLM validation
export const isValidLLM = (llm: LLM): boolean => {
  return (
    typeof llm.modelId === 'string' &&
    typeof llm.modelName === 'string' &&
    typeof llm.toolUse === 'boolean' &&
    Array.isArray(llm.regions) &&
    llm.regions.every((region) => BEDROCK_SUPPORTED_REGIONS.includes(region))
  )
}
export type ReasoningEffort = 'low' | 'medium' | 'high'

export interface InferenceParameters {
  maxTokens: number
  temperature: number
  topP: number
  thinking?: {
    enabled: boolean
    budgetTokens: number
    reasoningEffort?: ReasoningEffort
  }
}
