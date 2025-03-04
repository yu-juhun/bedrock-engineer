import React from 'react'
import { Agent } from '@/types/agent-chat'
import { TbRobot } from 'react-icons/tb'
import { AGENT_ICONS } from '@renderer/components/icons/AgentIcons'

type AgentSelectorProps = {
  agents: readonly Agent[]
  selectedAgent: string
  onOpenSettings: () => void
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({
  agents,
  selectedAgent,
  onOpenSettings
}) => {
  const selectedAgentData = agents.find((agent) => agent.id === selectedAgent)

  return (
    <div className="justify-center flex items-center gap-2">
      <div className="relative w-[30vw]">
        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-900
            text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800
            transition-colors"
        >
          <span className="flex items-center gap-2">
            <span className="text-gray-600 dark:text-gray-400">
              {selectedAgentData?.icon ? (
                React.cloneElement(
                  AGENT_ICONS.find((opt) => opt.value === selectedAgentData.icon)
                    ?.icon as React.ReactElement,
                  {
                    className: 'w-5 h-5'
                  }
                )
              ) : (
                <TbRobot className="w-5 h-5" />
              )}
            </span>
            <span className="flex-1 text-left">{selectedAgentData?.name}</span>
          </span>
        </button>
      </div>
    </div>
  )
}
