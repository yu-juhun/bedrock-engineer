import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiTrash, FiPlus, FiZap } from 'react-icons/fi'
import { ScenariosSectionProps } from './types'

export const ScenariosSection: React.FC<ScenariosSectionProps> = ({
  scenarios,
  name,
  description,
  system,
  onChange,
  isGenerating,
  onAutoGenerate
}) => {
  const { t } = useTranslation()
  const [newScenario, setNewScenario] = useState({ title: '', content: '' })

  const addScenario = () => {
    if (newScenario.title && newScenario.content) {
      onChange([...scenarios, newScenario])
      setNewScenario({ title: '', content: '' })
    }
  }

  const removeScenario = (index: number) => {
    onChange(scenarios.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Scenarios {t('optional')}
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {t('scenariosDescription')}
          </p>
        </div>

        {name && description && system && (
          <button
            type="button"
            onClick={onAutoGenerate}
            disabled={isGenerating}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-green-600 dark:bg-green-700
              border border-transparent rounded-md shadow-sm hover:bg-green-700 dark:hover:bg-green-600
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-900
              disabled:opacity-50"
          >
            <FiZap />
            <span>{isGenerating ? t('generating') : t('autoGenerateScinario')}</span>
          </button>
        )}
      </div>

      <div className="space-y-2">
        {scenarios.map((scenario, index) => (
          <div key={index} className="flex items-center space-x-2">
            <textarea
              value={scenario.title}
              readOnly
              className="flex-2 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800
                text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <textarea
              value={scenario.content}
              readOnly
              className="flex-1 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800
                text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <button
              type="button"
              onClick={() => removeScenario(index)}
              title={t('deleteScenario')}
              className="p-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
            >
              <FiTrash />
            </button>
          </div>
        ))}
      </div>

      {isGenerating ? (
        <Loading />
      ) : (
        <div className="flex space-x-2 justify-between">
          <textarea
            value={newScenario.title}
            onChange={(e) => setNewScenario({ ...newScenario, title: e.target.value })}
            placeholder={t('scenarioTitlePlaceholder')}
            className="flex-2 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800
            text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm h-[4rem]"
          />
          <textarea
            value={newScenario.content}
            onChange={(e) => setNewScenario({ ...newScenario, content: e.target.value })}
            placeholder={t('scenarioContentPlaceholder')}
            className="flex-1 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800
            text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm h-[4rem]"
          />
          <button
            type="button"
            onClick={addScenario}
            className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            <FiPlus />
          </button>
        </div>
      )}
    </div>
  )
}

const Loading = () => {
  return (
    <div className="flex flex-col gap-2 w-full">
      <span className="animate-pulse h-2 w-12 bg-slate-200 rounded"></span>
      <div className="flex-1 space-y-6 py-1">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4">
            <div className="h-2 bg-slate-200 rounded col-span-2"></div>
            <div className="h-2 bg-slate-200 rounded col-span-1"></div>
          </div>
          <div className="h-2 bg-slate-200 rounded"></div>
        </div>
      </div>
    </div>
  )
}
