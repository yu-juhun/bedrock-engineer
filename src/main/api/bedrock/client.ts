import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime'
import { BedrockClient } from '@aws-sdk/client-bedrock'
import { BedrockAgentRuntimeClient } from '@aws-sdk/client-bedrock-agent-runtime'
import type { AWSCredentials } from './types'
import { fromIni } from '@aws-sdk/credential-providers'

export function createRuntimeClient(awsCredentials: AWSCredentials) {
  const { region, useProfile, profile, ...credentials } = awsCredentials

  return new BedrockRuntimeClient({
    region,
    credentials: useProfile && profile ? fromIni({ profile }) : credentials
  })
}

export function createBedrockClient(awsCredentials: AWSCredentials) {
  const { region, useProfile, profile, ...credentials } = awsCredentials

  return new BedrockClient({
    region,
    credentials: useProfile && profile ? fromIni({ profile }) : credentials
  })
}

export function createAgentRuntimeClient(awsCredentials: AWSCredentials) {
  const { region, useProfile, profile, ...credentials } = awsCredentials

  return new BedrockAgentRuntimeClient({
    region,
    credentials: useProfile && profile ? fromIni({ profile }) : credentials
  })
}
