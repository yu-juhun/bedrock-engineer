import React, { useState, memo } from 'react'
import { InputForm } from '../InputForm'
import { AttachedImage } from '../InputForm/TextArea'
import { SendMsgKey } from '@/types/agent-chat'

type InputFormContainerProps = {
  loading: boolean
  projectPath?: string
  sendMsgKey?: SendMsgKey
  onSubmit: (input: string, attachedImages: AttachedImage[]) => void
  onOpenToolSettings: () => void
  onSelectDirectory: () => void
  onOpenIgnoreModal: () => void
  onClearChat: () => void
  onStopGeneration?: () => void
  hasMessages: boolean
}

/**
 * 入力フォームを管理する独立したコンテナコンポーネント
 * 内部で入力状態を管理し、親コンポーネントへの不要な再レンダリングを防止する
 */
const InputFormContainer: React.FC<InputFormContainerProps> = ({
  loading,
  projectPath = '',
  sendMsgKey = 'Enter',
  onSubmit,
  onOpenToolSettings,
  onSelectDirectory,
  onOpenIgnoreModal,
  onClearChat,
  onStopGeneration,
  hasMessages
}) => {
  // ローカルで入力状態を管理
  const [localUserInput, setLocalUserInput] = useState('')

  // 送信処理 - 親コンポーネントに値を渡す
  const handleSubmit = (input: string, attachedImages: AttachedImage[]) => {
    onSubmit(input, attachedImages)
    setLocalUserInput('') // 送信後に入力をクリア
  }

  // チャットクリア処理 - ローカル入力もクリア
  const handleClearChat = () => {
    onClearChat()
    setLocalUserInput('')
  }

  return (
    <InputForm
      userInput={localUserInput}
      loading={loading}
      projectPath={projectPath}
      sendMsgKey={sendMsgKey}
      onSubmit={handleSubmit}
      onChange={setLocalUserInput}
      onOpenToolSettings={onOpenToolSettings}
      onSelectDirectory={onSelectDirectory}
      onOpenIgnoreModal={onOpenIgnoreModal}
      onClearChat={handleClearChat}
      onStopGeneration={onStopGeneration}
      hasMessages={hasMessages}
    />
  )
}

// React.memo でコンポーネントをメモ化
export default memo(InputFormContainer)
