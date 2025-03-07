import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime'
import { BedrockClient } from '@aws-sdk/client-bedrock'
import { BedrockAgentRuntimeClient } from '@aws-sdk/client-bedrock-agent-runtime'
import type { AWSCredentials } from './types'

export function createRuntimeClient(awsCredentials: AWSCredentials) {
  const { credentials, region } = awsCredentials
  return new BedrockRuntimeClient({ credentials, region })
}

export function createBedrockClient(awsCredentials: AWSCredentials) {
  const { credentials, region } = awsCredentials
  return new BedrockClient({ credentials, region })
}

export function createAgentRuntimeClient(awsCredentials: AWSCredentials) {
  const { credentials, region } = awsCredentials
  return new BedrockAgentRuntimeClient({ credentials, region })
}
