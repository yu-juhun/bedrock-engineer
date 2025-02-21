import { useState } from 'react'
import { nanoid } from 'nanoid'
import { CustomAgent } from '@/types/agent-chat'

export const useAgentForm = (initialAgent?: CustomAgent, onSave?: (agent: CustomAgent) => void) => {
  const [formData, setFormData] = useState<CustomAgent>({
    id: initialAgent?.id || `custom_agent_${nanoid(8)}`,
    name: initialAgent?.name || '',
    description: initialAgent?.description || '',
    system: initialAgent?.system || '',
    scenarios: initialAgent?.scenarios || [],
    isCustom: true
  })

  const updateField = <K extends keyof CustomAgent>(field: K, value: CustomAgent[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave?.(formData)
  }

  return {
    formData,
    updateField,
    handleSubmit
  }
}
