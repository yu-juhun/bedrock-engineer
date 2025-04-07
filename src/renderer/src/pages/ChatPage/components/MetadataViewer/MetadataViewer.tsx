import React from 'react'
import { useTranslation } from 'react-i18next'
import { JSONCodeBlock } from '../CodeBlocks/JSONCodeBlock'
import { CheckCircleIcon, ServerIcon } from '@heroicons/react/24/outline'

interface MetadataViewerProps {
  metadata: any // ConverseStreamMetadataEvent | Record<string, any>
}

export const MetadataViewer: React.FC<MetadataViewerProps> = ({ metadata }) => {
  const { t } = useTranslation()

  if (!metadata) {
    return <div className="text-gray-500">{t('No metadata available')}</div>
  }

  return (
    <div className="text-sm flex flex-col gap-6">
      {metadata.usage && (
        <div className="flex flex-col gap-3">
          <h3 className="font-medium text-base border-b pb-2">{t('Token Usage')}</h3>
          <div className="grid grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div className="flex flex-col">
              <span className="text-gray-500">{t('Input')}</span>
              <span className="font-medium text-lg">{metadata.usage.inputTokens}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500">{t('Output')}</span>
              <span className="font-medium text-lg">{metadata.usage.outputTokens}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500">{t('Total')}</span>
              <span className="font-medium text-lg">{metadata.usage.totalTokens}</span>
            </div>
          </div>
        </div>
      )}

      {/* キャッシュ情報セクション - キャッシュ情報がある場合のみ表示 */}
      {metadata.usage &&
        (metadata.usage.cacheReadInputTokens !== undefined ||
          metadata.usage.cacheWriteInputTokens !== undefined) && (
          <div className="flex flex-col gap-3">
            <h3 className="font-medium text-base border-b pb-2">{t('Cache Usage')}</h3>
            <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="flex flex-col">
                <span className="text-gray-500">{t('Cache Read')}</span>
                <span className="font-medium text-lg">
                  {metadata.usage.cacheReadInputTokens || 0}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-500">{t('Cache Write')}</span>
                <span className="font-medium text-lg">
                  {metadata.usage.cacheWriteInputTokens || 0}
                </span>
              </div>
            </div>

            {/* キャッシュ状態インジケーター */}
            <div className="mt-1">
              {metadata.usage.cacheReadInputTokens > 0 && (
                <div className="flex items-center text-green-500 text-sm">
                  <CheckCircleIcon className="w-4 h-4 mr-1" />
                  <span>{t('Cache hit detected!')}</span>
                </div>
              )}
              {metadata.usage.cacheWriteInputTokens > 0 &&
                metadata.usage.cacheReadInputTokens === 0 && (
                  <div className="flex items-center text-blue-500 text-sm">
                    <ServerIcon className="w-4 h-4 mr-1" />
                    <span>{t('New cache created')}</span>
                  </div>
                )}
            </div>
          </div>
        )}

      {metadata.metrics && (
        <div className="flex flex-col gap-3">
          <h3 className="font-medium text-base border-b pb-2">{t('Performance')}</h3>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div className="flex flex-col">
              <span className="text-gray-500">{t('Latency')}</span>
              <span className="font-medium text-lg">{metadata.metrics.latencyMs} ms</span>
            </div>
          </div>
        </div>
      )}

      {metadata.trace && (
        <div className="flex flex-col gap-3">
          <h3 className="font-medium text-base border-b pb-2">{t('Trace')}</h3>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg overflow-auto max-h-64">
            <JSONCodeBlock json={metadata.trace} />
          </div>
        </div>
      )}

      {metadata.performanceConfig && (
        <div className="flex flex-col gap-3">
          <h3 className="font-medium text-base border-b pb-2">{t('Performance Config')}</h3>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg overflow-auto max-h-64">
            <JSONCodeBlock json={metadata.performanceConfig} />
          </div>
        </div>
      )}
    </div>
  )
}
