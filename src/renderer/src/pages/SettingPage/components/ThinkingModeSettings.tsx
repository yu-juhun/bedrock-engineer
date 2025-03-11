import { useSettings } from '@renderer/contexts/SettingsContext'
import { useTranslation } from 'react-i18next'
import { ThinkingModeBudget } from '@/types/llm'

export const ThinkingModeSettings = () => {
  const { thinkingMode, updateThinkingMode, currentLLM } = useSettings()
  const { t } = useTranslation()
  const supportsThinking = currentLLM?.supportsThinking || false

  const handleToggleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateThinkingMode({
      enabled: e.target.checked,
      type: 'enabled',
      budget_tokens: thinkingMode?.budget_tokens || ThinkingModeBudget.NORMAL
    })
  }

  const handleBudgetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateThinkingMode({
      enabled: thinkingMode?.enabled || false,
      type: 'enabled',
      budget_tokens: Number(e.target.value)
    })
  }

  if (!supportsThinking) {
    return null
  }

  return (
    <div className="space-y-4 pt-2 pb-1">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900 dark:text-white">
          {t('Thinking Mode')}
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('Thinking mode allows Claude to work through complex problems step by step.')}
        </p>

        <div className="flex items-center space-x-2">
          <input
            id="enable-thinking-mode"
            type="checkbox"
            checked={thinkingMode?.enabled || false}
            onChange={handleToggleChange}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label
            htmlFor="enable-thinking-mode"
            className="text-sm text-gray-700 dark:text-gray-300"
          >
            {t('Enable Thinking Mode')}
          </label>
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-900 dark:text-white">
          {t('Thinking Budget')}
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('Available only with Claude 3.7 Sonnet.')}
        </p>
        <select
          value={thinkingMode?.budget_tokens?.toString() || ThinkingModeBudget.NORMAL.toString()}
          onChange={handleBudgetChange}
          disabled={!thinkingMode?.enabled}
          className="
            bg-white dark:bg-gray-800
            border border-gray-300 dark:border-gray-600
            text-gray-900 dark:text-white
            text-sm rounded-lg
            focus:ring-blue-500 dark:focus:ring-blue-500
            focus:border-blue-500 dark:focus:border-blue-500
            block w-full p-2.5
          "
        >
          <option value={ThinkingModeBudget.NORMAL.toString()}>{t('Normal (4K tokens)')}</option>
          <option value={ThinkingModeBudget.DEEP.toString()}>{t('Deep (16K tokens)')}</option>
          <option value={ThinkingModeBudget.DEEPER.toString()}>{t('Deeper (32K tokens)')}</option>
        </select>
      </div>
    </div>
  )
}
