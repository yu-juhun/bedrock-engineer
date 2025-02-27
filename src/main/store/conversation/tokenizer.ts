/**
 * トークン数を見積もるためのシンプルな実装
 * 正確なトークン数計算には専用のライブラリが必要だが、
 * 近似値として文字数ベースの簡易的な計算を行う
 */
export function estimateTokenCount(text: string): number {
  // 英語：平均して1トークンあたり約4文字（単語ごとに分かれるため）
  // 日本語：平均して1トークンあたり約1-2文字（文字単位でトークン化されるため）
  // 保守的に見積もって2文字あたり1トークンと仮定
  return Math.ceil(text.length / 2)
}

/**
 * オブジェクトのJSON文字列をトークン数に変換する
 */
export function estimateObjectTokens(obj: any): number {
  const jsonString = JSON.stringify(obj)
  return estimateTokenCount(jsonString)
}

/**
 * テキストを指定されたトークン数以下に切り詰める
 */
export function truncateToTokenLimit(text: string, maxTokens: number): string {
  if (estimateTokenCount(text) <= maxTokens) {
    return text
  }

  // 簡易的な実装：文字数を基準に切り詰める
  const estimatedCharsPerToken = 2
  const maxChars = maxTokens * estimatedCharsPerToken

  return text.substring(0, maxChars) + '...'
}
