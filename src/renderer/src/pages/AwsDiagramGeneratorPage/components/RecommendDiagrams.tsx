import React from 'react'
import { motion } from 'framer-motion'
import LoadingDotsLottie from '@renderer/pages/WebsiteGeneratorPage/LoadingDots.lottie'

interface Recommendation {
  title: string
  value: string
}

interface RecommendDiagramsProps {
  loading: boolean
  recommendations: Recommendation[]
  onSelect: (value: string) => void
  loadingText?: string
}

export const RecommendDiagrams: React.FC<RecommendDiagramsProps> = ({
  loading,
  recommendations,
  onSelect,
  loadingText = 'Generating recommendations...'
}) => {
  if (loading) {
    return (
      <div className="flex gap-1 justify-center items-center dark:text-white">
        <LoadingDotsLottie className="h-[2rem]" />
        <span className="dark:text-white">{loadingText}</span>
      </div>
    )
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {recommendations?.map((recommendation, index) => (
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
          key={recommendation.title}
          className="cursor-pointer rounded-full border p-2 text-xs hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:hover:border-gray-600"
          onClick={() => onSelect(recommendation.value)}
        >
          {recommendation.title}
        </motion.button>
      ))}
    </div>
  )
}
