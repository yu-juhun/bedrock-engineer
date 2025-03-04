import React from 'react'
import { useTranslation } from 'react-i18next'
import useSetting from '@renderer/hooks/useSetting'
import { AgentFormProps } from './types'
import { useAgentForm } from './useAgentForm'
import { BasicSection } from './BasicSection'
import { SystemPromptSection } from './SystemPromptSection'
import { ScenariosSection } from './ScenariosSection'
import { TagsSection } from './TagsSection'
import { useAgentGenerator } from '../../hooks/useAgentGenerator'
import { useScenarioGenerator } from '../../hooks/useScenarioGenerator'
import toast from 'react-hot-toast'
import { FiSave } from 'react-icons/fi'

export const AgentForm: React.FC<AgentFormProps> = ({ agent, onSave }) => {
  const { t } = useTranslation()
  const { projectPath, allowedCommands, knowledgeBases, bedrockAgents, agents } = useSetting()
  const availableTags = React.useMemo(() => {
    const tagSet = new Set<string>()
    agents.forEach((agent) => {
      agent.tags?.forEach((tag) => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }, [agents])
  const { formData, updateField, handleSubmit } = useAgentForm(agent, onSave)
  const { generateAgentSystemPrompt, generatedAgentSystemPrompt, isGenerating } =
    useAgentGenerator()
  const {
    generateScenarios,
    generatedScenarios,
    isGenerating: isGeneratingScenarios
  } = useScenarioGenerator()

  const handleAutoGeneratePrompt = async () => {
    if (!formData.name || !formData.description) {
      toast.error(t('pleaseEnterNameAndDescription'))
      return
    }
    await generateAgentSystemPrompt(formData.name, formData.description)
  }

  const handleGenerateScenarios = async () => {
    if (!formData.name || !formData.description || !formData.system) {
      toast.error(t('inputAgentInfoError'))
      return
    }
    await generateScenarios(formData.name, formData.description, formData.system)
  }

  // Update system prompt when generated
  React.useEffect(() => {
    if (generatedAgentSystemPrompt) {
      updateField('system', generatedAgentSystemPrompt)
    }
  }, [generatedAgentSystemPrompt])

  // Update scenarios when generated
  React.useEffect(() => {
    if (generatedScenarios.length > 0) {
      updateField('scenarios', generatedScenarios)
    }
  }, [generatedScenarios])

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <BasicSection
        name={formData.name}
        description={formData.description}
        icon={formData.icon}
        iconColor={formData.iconColor}
        onChange={(field, value) => updateField(field, value)}
      />

      <SystemPromptSection
        system={formData.system}
        name={formData.name}
        description={formData.description}
        onChange={(value) => updateField('system', value)}
        onAutoGenerate={handleAutoGeneratePrompt}
        isGenerating={isGenerating}
        projectPath={projectPath}
        allowedCommands={allowedCommands}
        knowledgeBases={knowledgeBases}
        bedrockAgents={bedrockAgents}
      />

      <ScenariosSection
        scenarios={formData.scenarios}
        name={formData.name}
        description={formData.description}
        system={formData.system}
        onChange={(scenarios) => updateField('scenarios', scenarios)}
        isGenerating={isGeneratingScenarios}
        onAutoGenerate={handleGenerateScenarios}
      />

      <TagsSection
        tags={formData.tags || []}
        availableTags={availableTags}
        onChange={(tags) => updateField('tags', tags)}
      />

      <div className="flex justify-end pt-4 pb-4 space-x-2">
        <button
          type="submit"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-700 border border-transparent
            rounded-md shadow-sm hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2
            focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
        >
          <FiSave />
          <p>{t('save')}</p>
        </button>
      </div>
    </form>
  )
}
