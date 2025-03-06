import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime'
import { BedrockClient } from '@aws-sdk/client-bedrock'
import { BedrockAgentRuntimeClient } from '@aws-sdk/client-bedrock-agent-runtime'
import type { AWSCredentials } from './types'

export function createRuntimeClient(credentials: AWSCredentials) {
  const { region, accessKeyId, secretAccessKey, sessionToken } = credentials
  return new BedrockRuntimeClient({
    credentials: {
      accessKeyId,
      secretAccessKey,
      ...(sessionToken && { sessionToken })
    },
    region
  })
}

export function createBedrockClient(credentials: AWSCredentials) {
  const { region, accessKeyId, secretAccessKey, sessionToken } = credentials
  return new BedrockClient({
    credentials: {
      accessKeyId,
      secretAccessKey,
      ...(sessionToken && { sessionToken })
    },
    region
  })
}

export function createAgentRuntimeClient(credentials: AWSCredentials) {
  const { region, accessKeyId, secretAccessKey, sessionToken } = credentials
  return new BedrockAgentRuntimeClient({
    credentials: {
      accessKeyId,
      secretAccessKey,
      ...(sessionToken && { sessionToken })
    },
    region
  })
}
