import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { BasicSectionProps } from './types'
import { TbRobot } from 'react-icons/tb'
import { AGENT_ICONS } from '@renderer/components/icons/AgentIcons'

export const BasicSection: React.FC<BasicSectionProps> = ({
  name,
  description,
  icon,
  iconColor,
  onChange
}) => {
  const { t } = useTranslation()
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const iconPickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (iconPickerRef.current && !iconPickerRef.current.contains(event.target as Node)) {
        setShowIconPicker(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="flex gap-8 min-h-[140px]">
      {/* Left: Icon Section */}
      <div className="w-[140px] shrink-0 flex items-center justify-center">
        <div className="relative flex items-center justify-center">
          <button
            type="button"
            onClick={() => setShowIconPicker(!showIconPicker)}
            className="flex items-center justify-center p-4 rounded-lg border
              border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800
              transition-colors w-24 h-24"
          >
            {icon ? (
              React.cloneElement(
                AGENT_ICONS.find((opt) => opt.value === icon)?.icon as React.ReactElement,
                {
                  className: 'w-12 h-12',
                  style: iconColor ? { color: iconColor } : undefined
                }
              )
            ) : (
              <TbRobot className="w-12 h-12" />
            )}
          </button>

          {showIconPicker && (
            <div
              ref={iconPickerRef}
              className="absolute z-50 left-full top-full ml-2 -mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border
                border-gray-200 dark:border-gray-700 p-2 w-[320px]"
            >
              {/* Color Picker */}
              <div className="p-2 border-b border-gray-200 dark:border-gray-700 pb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  {t('iconColor')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={iconColor || '#000000'}
                    onChange={(e) => onChange('iconColor', e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => onChange('iconColor', undefined)}
                    className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {t('reset')}
                  </button>
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchIcons')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                    bg-gray-50 dark:bg-gray-700 text-sm focus:outline-none focus:ring-2
                    focus:ring-blue-500 dark:focus:ring-blue-400 mb-2"
                />
              </div>
              <div className="max-h-[420px] overflow-y-auto p-2">
                {(
                  ['general', 'development', 'cloud', 'devops', 'security', 'monitoring'] as const
                ).map((category) => {
                  const categoryIcons = AGENT_ICONS.filter(
                    (opt) =>
                      opt.category === category &&
                      (searchQuery === '' ||
                        opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
                  )

                  if (categoryIcons.length === 0) return null

                  return (
                    <div key={category} className="mb-4 last:mb-0">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2 px-1">
                        {t(`iconCategory.${category}`)}
                      </h3>
                      <div className="grid grid-cols-6 gap-2">
                        {categoryIcons.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              onChange('icon', option.value)
                              setShowIconPicker(false)
                            }}
                            className={`flex items-center justify-center p-2 rounded-lg hover:bg-gray-100
                              dark:hover:bg-gray-700 ${
                                icon === option.value
                                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                  : ''
                              }`}
                            title={option.label}
                          >
                            <div className="w-6 h-6 flex items-center justify-center">
                              {React.cloneElement(option.icon as React.ReactElement, {
                                className: 'w-8 h-8'
                              })}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Name and Description Section */}
      <div className="flex-1 space-y-4">
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
    </div>
  )
}
