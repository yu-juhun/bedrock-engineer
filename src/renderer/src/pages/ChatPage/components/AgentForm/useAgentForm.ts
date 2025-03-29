import { useState, useCallback } from 'react'
import { nanoid } from 'nanoid'
import { CustomAgent } from '@/types/agent-chat'
import { ToolName } from '@/types/tools'

export const useAgentForm = (initialAgent?: CustomAgent, onSave?: (agent: CustomAgent) => void) => {
  const [formData, setFormData] = useState<CustomAgent>({
    id: initialAgent?.id || `custom_agent_${nanoid(8)}`,
    name: initialAgent?.name || '',
    description: initialAgent?.description || '',
    system: initialAgent?.system || '',
    scenarios: initialAgent?.scenarios || [],
    tags: initialAgent?.tags || [],
    isCustom: true,
    icon: initialAgent?.icon || 'robot',
    iconColor: initialAgent?.iconColor,
    tools: initialAgent?.tools || ([] as ToolName[]),
    category: initialAgent?.category || 'all'
  })

  // useCallbackでメモ化して、再レンダリングによる関数参照の変更を防止
  const updateField = useCallback(
    <K extends keyof CustomAgent>(field: K, value: CustomAgent[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
    },
    []
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      // デバッグログ追加
      console.log('Form submitted with data:', formData)
      // 保存処理実行
      if (onSave) {
        console.log('Calling onSave callback')
        onSave(formData)
      } else {
        console.warn('onSave callback is not provided')
      }
    },
    [formData, onSave]
  )

  return {
    formData,
    updateField,
    handleSubmit
  }
}
