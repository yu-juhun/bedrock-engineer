import React from 'react'
import { Agent } from '@/types/agent-chat'
import { TbRobot } from 'react-icons/tb'
import { FaCode } from 'react-icons/fa'
import { MdDesignServices } from 'react-icons/md'
import { BsLaptopFill } from 'react-icons/bs'

type AgentSelectorProps = {
  agents: readonly Agent[]
  selectedAgent: string
  onOpenSettings: () => void
}

const AGENT_ICONS = {
  softwareAgent: <BsLaptopFill className="size-4" />,
  codeBuddy: <FaCode className="size-4" />,
  productDesigner: <MdDesignServices className="size-4" />
} as const

const AGENT_COLORS = {
  softwareAgent: {
    icon: 'text-blue-600 dark:text-blue-400',
    hover: 'hover:bg-blue-50 dark:hover:bg-blue-900/50'
  },
  codeBuddy: {
    icon: 'text-green-600 dark:text-green-400',
    hover: 'hover:bg-green-50 dark:hover:bg-green-900/50'
  },
  productDesigner: {
    icon: 'text-purple-600 dark:text-purple-400',
    hover: 'hover:bg-purple-50 dark:hover:bg-purple-900/50'
  }
} as const

export const AgentSelector: React.FC<AgentSelectorProps> = ({
  agents,
  selectedAgent,
  onOpenSettings
}) => {
  const selectedAgentData = agents.find((agent) => agent.id === selectedAgent)
  const colors = AGENT_COLORS[selectedAgent as keyof typeof AGENT_COLORS] || {
    icon: 'text-gray-600 dark:text-gray-400',
    hover: 'hover:bg-gray-50 dark:hover:bg-gray-800'
  }

  return (
    <div className="justify-center flex items-center gap-2">
      <div className="relative w-[30vw]">
        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-900
            text-gray-600 dark:text-gray-300 rounded-md hover:text-gray-500 dark:hover:text-gray-400
            transition-colors"
        >
          <span className="flex items-center gap-2">
            <span className={colors.icon}>
              {AGENT_ICONS[selectedAgent as keyof typeof AGENT_ICONS] || (
                <TbRobot className="size-4" />
              )}
            </span>
            <span className="flex-1 text-left">{selectedAgentData?.name}</span>
          </span>
        </button>
      </div>
    </div>
  )
}
