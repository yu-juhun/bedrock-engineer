import React, { useState } from 'react'
import { CustomAgent } from '@/types/agent-chat'
import useSetting from '@renderer/hooks/useSetting'
import { useTranslation } from 'react-i18next'
import { Modal } from 'flowbite-react'
import { AgentForm } from '../components/AgentForm/AgentForm'
import { AgentList } from '../components/AgentList'
import toast from 'react-hot-toast'

export const useAgentSettingsModal = () => {
  const [show, setShow] = useState(false)

  const handleOpen = () => setShow(true)
  const handleClose = () => setShow(false)

  return {
    show,
    handleOpen,
    handleClose,
    AgentSettingsModal: AgentSettingsModal
  }
}

interface AgentSettingModalProps {
  isOpen: boolean
  onClose: () => void
  selectedAgentId?: string
  onSelectAgent?: (agentId: string) => void
}

const AgentSettingsModal = React.memo(
  ({ isOpen, onClose, selectedAgentId, onSelectAgent }: AgentSettingModalProps) => {
    const [editingAgent, setEditingAgent] = useState<CustomAgent | null>(null)
    const { customAgents, saveCustomAgents, agents, loadSharedAgents } = useSetting()
    const { t } = useTranslation()

    const handleSaveAgent = (agent: CustomAgent) => {
      const updatedAgents = editingAgent?.id
        ? customAgents.map((a) => (a.id === agent.id ? agent : a))
        : [...customAgents, agent]
      saveCustomAgents(updatedAgents)
      setEditingAgent(null)
      onClose()
    }

    const handleDeleteAgent = (id: string) => {
      const updatedAgents = customAgents.filter((agent) => agent.id !== id)
      saveCustomAgents(updatedAgents)
    }

    const handleDuplicateAgent = (agent: CustomAgent) => {
      const newAgent = {
        ...agent,
        id: crypto.randomUUID(),
        name: `${agent.name} (${t('copy')})`
      }
      saveCustomAgents([...customAgents, newAgent])
    }

    const handleSelectAgent = (agentId: string) => {
      if (onSelectAgent) {
        onSelectAgent(agentId)
        onClose()
      }
    }

    // Handler to save agent as a shared file
    const handleSaveAsShared = async (agent: CustomAgent) => {
      try {
        const result = await window.file.saveSharedAgent(agent)
        if (result.success) {
          // Show success notification or toast here if needed
          console.log('Agent saved as shared file:', result.filePath)

          // Load the updated shared agents to refresh the list in the UI
          await loadSharedAgents()

          // Show success message
          toast.success(t('agentSavedAsShared'), {
            duration: 5000
          })
        } else {
          console.error('Failed to save agent as shared file:', result.error)
          toast.error(result.error || t('failedToSaveShared'))
        }
      } catch (error) {
        console.error('Error saving shared agent:', error)
        toast.error(t('failedToSaveShared'))
      }
    }

    return (
      <Modal
        dismissible
        show={isOpen}
        onClose={() => {
          setEditingAgent(null)
          onClose()
        }}
        size="8xl"
      >
        <Modal.Header className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {editingAgent ? t('editAgent') : t('customAgents')}
            </h3>
          </div>
        </Modal.Header>
        <Modal.Body className="p-6">
          <div className="space-y-6 min-h-[800px]">
            {editingAgent ? (
              <AgentForm
                agent={editingAgent}
                onSave={handleSaveAgent}
                onCancel={() => setEditingAgent(null)}
              />
            ) : (
              <AgentList
                agents={agents}
                customAgents={customAgents}
                selectedAgentId={selectedAgentId}
                onSelectAgent={handleSelectAgent}
                onAddNewAgent={() => setEditingAgent({} as CustomAgent)}
                onEditAgent={setEditingAgent}
                onDuplicateAgent={handleDuplicateAgent}
                onDeleteAgent={handleDeleteAgent}
                onSaveAsShared={handleSaveAsShared}
              />
            )}
          </div>
        </Modal.Body>
      </Modal>
    )
  }
)

AgentSettingsModal.displayName = 'AgentSettingsModal'
