import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime'
import { BedrockClient } from '@aws-sdk/client-bedrock'
import { BedrockAgentRuntimeClient } from '@aws-sdk/client-bedrock-agent-runtime'
import type { AWSCredentials } from './types'

export function createRuntimeClient(awsCredentials: AWSCredentials) {
  return new BedrockRuntimeClient(awsCredentials)
}

export function createBedrockClient(awsCredentials: AWSCredentials) {
  return new BedrockClient(awsCredentials)
}

export function createAgentRuntimeClient(awsCredentials: AWSCredentials) {
  return new BedrockAgentRuntimeClient(awsCredentials)
}
