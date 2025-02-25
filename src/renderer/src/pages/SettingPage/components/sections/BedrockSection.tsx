import React from 'react'
import { useTranslation } from 'react-i18next'
import { FcElectronics, FcMindMap, FcAdvance } from 'react-icons/fc'
import { SettingSection } from '../SettingSection'
import { SettingSelect } from '../SettingSelect'
import { SettingInput } from '../SettingInput'
import { LLM, ReasoningEffort } from '@/types/llm'

interface BedrockSectionProps {
  currentLLM: LLM
  availableModels: LLM[]
  inferenceParams: {
    maxTokens: number
    temperature: number
    topP: number
    thinking?: {
      enabled: boolean
      budgetTokens: number
      reasoningEffort?: ReasoningEffort
    }
  }
  onUpdateLLM: (modelId: string) => void
  onUpdateInferenceParams: (params: Partial<BedrockSectionProps['inferenceParams']>) => void
}

export const BedrockSection: React.FC<BedrockSectionProps> = ({
  currentLLM,
  availableModels,
  inferenceParams,
  onUpdateLLM,
  onUpdateInferenceParams
}) => {
  const { t } = useTranslation()
  const isClaude37OrLater = currentLLM?.modelId?.includes('claude-3-7') || false

  const modelOptions = availableModels.map((model) => ({
    value: model.modelId,
    label: model.modelName
  }))

  // Default values if not set
  const budgetTokens = inferenceParams.thinking?.budgetTokens || 4000
  const reasoningEffort = inferenceParams.thinking?.reasoningEffort || 'medium'

  // 強度に応じたトークン数を設定する関数
  const getBudgetTokensFromEffort = (effort: ReasoningEffort): number => {
    switch (effort) {
      case 'low':
        return 1024
      case 'medium':
        return 2048
      case 'high':
        return 4096
      default:
        return 2048
    }
  }

  return (
    <div className="space-y-6">
      <SettingSection title={t('Amazon Bedrock')} icon={FcElectronics}>
        <SettingSelect
          label={t('LLM (Large Language Model)')}
          value={currentLLM?.modelId}
          options={modelOptions}
          onChange={(e) => onUpdateLLM(e.target.value)}
        />
      </SettingSection>

      <SettingSection title={t('Inference Parameters')} icon={FcMindMap}>
        <div className="space-y-4">
          <SettingInput
            label={t('Max Tokens')}
            type="number"
            placeholder={t('Max tokens')}
            value={inferenceParams.maxTokens}
            min={1}
            max={4096}
            onChange={(e) => {
              onUpdateInferenceParams({ maxTokens: parseInt(e.target.value, 10) })
            }}
          />

          <SettingInput
            label={t('Temperature')}
            type="number"
            placeholder={t('Temperature')}
            value={inferenceParams.temperature}
            min={0}
            max={1.0}
            step={0.1}
            onChange={(e) => {
              onUpdateInferenceParams({ temperature: parseFloat(e.target.value) })
            }}
          />

          <SettingInput
            label={t('topP')}
            type="number"
            placeholder={t('topP')}
            value={inferenceParams.topP}
            min={0}
            max={1}
            step={0.1}
            onChange={(e) => {
              onUpdateInferenceParams({ topP: parseFloat(e.target.value) })
            }}
          />
        </div>
      </SettingSection>

      {/* Claude 3.7 モデルが選択されている場合のみ Reasoning 設定を表示 */}
      {isClaude37OrLater && (
        <SettingSection title={t('Reasoning (Extended Thinking)')} icon={FcAdvance}>
          <div className="space-y-4">
            <div className="flex items-center mb-4">
              <input
                id="reasoning-toggle"
                type="checkbox"
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                checked={inferenceParams.thinking?.enabled || false}
                onChange={(e) => {
                  onUpdateInferenceParams({
                    thinking: {
                      enabled: e.target.checked,
                      budgetTokens: budgetTokens,
                      reasoningEffort: reasoningEffort
                    }
                  })
                }}
              />
              <label
                htmlFor="reasoning-toggle"
                className="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300"
              >
                {t('Enable Reasoning (Extended Thinking)')}
              </label>
            </div>

            <SettingSelect
              label={t('Reasoning Effort')}
              value={reasoningEffort}
              options={[
                { value: 'low', label: 'Low (1,024 tokens)' },
                { value: 'medium', label: 'Medium (2,048 tokens)' },
                { value: 'high', label: 'High (4,096 tokens)' }
              ]}
              onChange={(e) => {
                const selectedEffort = e.target.value as ReasoningEffort
                const tokensForEffort = getBudgetTokensFromEffort(selectedEffort)
                onUpdateInferenceParams({
                  thinking: {
                    enabled: inferenceParams.thinking?.enabled || false,
                    budgetTokens: tokensForEffort,
                    reasoningEffort: selectedEffort
                  }
                })
              }}
              description={t('Select reasoning effort level')}
            />

            <SettingInput
              label={t('Budget Tokens (Advanced)')}
              type="number"
              placeholder={t('Custom budget tokens for reasoning')}
              value={budgetTokens}
              min={1}
              max={32000}
              step={100}
              onChange={(e) => {
                const newBudgetTokens = parseInt(e.target.value, 10)
                onUpdateInferenceParams({
                  thinking: {
                    enabled: inferenceParams.thinking?.enabled || false,
                    budgetTokens: newBudgetTokens,
                    reasoningEffort: reasoningEffort
                  }
                })
              }}
              description={t(
                'Custom token allocation for model thinking (defaults set by effort level)'
              )}
            />
          </div>
        </SettingSection>
      )}
    </div>
  )
}
