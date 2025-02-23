export interface ContentChunk {
  index: number
  total: number
  content: string
  metadata?: {
    url?: string
    timestamp: number
  }
}

export class ContentChunker {
  private static readonly MAX_CHUNK_SIZE = 50000 // 約50,000文字（Claude 3 Haikuの制限を考慮）

  static splitContent(
    content: string,
    metadata: { url?: string },
    option?: { cleaning?: boolean }
  ): ContentChunk[] {
    const chunks: ContentChunk[] = []
    const timestamp = Date.now()

    // option のデフォルトは false
    if (option?.cleaning) {
      content = this.extractMainContent(content)
    }

    // コンテンツを適切なサイズに分割
    const totalChunks = Math.ceil(content.length / this.MAX_CHUNK_SIZE)

    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.MAX_CHUNK_SIZE
      const end = Math.min((i + 1) * this.MAX_CHUNK_SIZE, content.length)

      chunks.push({
        index: i + 1,
        total: totalChunks,
        content: content.slice(start, end),
        metadata: {
          ...metadata,
          timestamp
        }
      })
    }

    return chunks
  }

  public static extractMainContent(html: string): string {
    // 基本的なHTMLクリーニング
    const content = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // スクリプトの削除
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // スタイルの削除
      .replace(/<[^>]+>/g, '\n') // タグを改行に変換
      .replace(/&nbsp;/g, ' ') // HTMLエンティティの変換
      .replace(/\s+/g, ' ') // 連続する空白の削除
      .trim()

    return content
  }
}
