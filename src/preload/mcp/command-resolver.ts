import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'

/**
 * コマンド実行可能ファイルのパスを解決する
 * TODO: Windowsへの対応と動作確認が必要
 * TODO: PATH の設定をユーザー側で制御可能にする
 * @param command コマンド名（uvx など）
 * @returns 解決されたコマンドパス
 */
export function resolveCommand(command: string): string {
  try {
    // 1. 絶対パスの場合はそのまま使用
    if (path.isAbsolute(command)) {
      if (fs.existsSync(command)) {
        return command
      }
    }

    // 2. 一般的なインストール先を確認
    const commonPaths = [
      // グローバルnpmパッケージのパス
      '/usr/local/bin',
      '/opt/homebrew/bin',
      // Apple Silicon Mac用のHomebrew
      '/opt/homebrew/bin',
      // Intel Mac用のHomebrew
      '/usr/local/bin',
      // ユーザーのホームディレクトリ内のbin
      path.join(os.homedir(), '.npm-global/bin'),
      path.join(os.homedir(), 'bin'),
      path.join(os.homedir(), '.local/bin')
    ]

    for (const dir of commonPaths) {
      try {
        const fullPath = path.join(dir, command)
        if (fs.existsSync(fullPath)) {
          return fullPath
        }
      } catch (err) {
        // エラーを無視して次のパスを試行
      }
    }

    // 3. macOS/Linux環境ではwhichコマンドで探索
    if (process.platform !== 'win32') {
      try {
        const whichPath = execSync(`which ${command}`, { encoding: 'utf8' }).trim()
        if (whichPath && fs.existsSync(whichPath)) {
          return whichPath
        }
      } catch (err) {
        // whichコマンドが失敗した場合は無視
      }
    }
  } catch (error) {
    console.error(`Error resolving command path for ${command}:`, error)
  }

  // 最終的には元のコマンド名を返す
  return command
}
