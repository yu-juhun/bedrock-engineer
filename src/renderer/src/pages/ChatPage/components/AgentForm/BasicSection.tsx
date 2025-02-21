import React from 'react'
import { useTranslation } from 'react-i18next'
import { BasicSectionProps } from './types'

export const BasicSection: React.FC<BasicSectionProps> = ({ name, description, onChange }) => {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Name</label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('nameDescription')}</p>
        <input
          type="text"
          value={name}
          onChange={(e) => onChange('name', e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800
            text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          required
          placeholder={t('namePlaceholder')}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Description
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
          {t('descriptionDescription')}
        </p>
        <input
          type="text"
          value={description}
          onChange={(e) => onChange('description', e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800
            text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          required
          placeholder={t('descriptionPlaceholder')}
        />
      </div>
    </div>
  )
}
