import { ipcRenderer } from 'electron'

const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  VERBOSE: 'verbose'
}

export type LogLevel = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS]

/**
 * Send log message to main process via IPC
 */
const sendLogToMain = (level: LogLevel, message: string, meta: Record<string, any> = {}) => {
  ipcRenderer.send('logger:log', {
    level,
    message,
    timestamp: new Date().toISOString(),
    process: 'renderer',
    ...meta
  })
}

/**
 * Renderer logger API
 */
export const rendererLogger = {
  error: (message: string, meta: Record<string, any> = {}) => {
    sendLogToMain(LOG_LEVELS.ERROR as LogLevel, message, meta)
    console.error(message, meta)
  },
  warn: (message: string, meta: Record<string, any> = {}) => {
    sendLogToMain(LOG_LEVELS.WARN as LogLevel, message, meta)
    console.warn(message, meta)
  },
  info: (message: string, meta: Record<string, any> = {}) => {
    sendLogToMain(LOG_LEVELS.INFO as LogLevel, message, meta)
    console.info(message, meta)
  },
  debug: (message: string, meta: Record<string, any> = {}) => {
    sendLogToMain(LOG_LEVELS.DEBUG as LogLevel, message, meta)
    console.debug(message, meta)
  },
  verbose: (message: string, meta: Record<string, any> = {}) => {
    sendLogToMain(LOG_LEVELS.VERBOSE as LogLevel, message, meta)
    console.log(message, meta) // Use standard log for verbose as console.verbose isn't standard
  }
}

/**
 * Create a category-specific logger for renderer
 */
export const createRendererCategoryLogger = (category: string) => {
  return {
    error: (message: string, meta: Record<string, any> = {}) => {
      rendererLogger.error(message, { ...meta, category })
    },
    warn: (message: string, meta: Record<string, any> = {}) => {
      rendererLogger.warn(message, { ...meta, category })
    },
    info: (message: string, meta: Record<string, any> = {}) => {
      rendererLogger.info(message, { ...meta, category })
    },
    debug: (message: string, meta: Record<string, any> = {}) => {
      rendererLogger.debug(message, { ...meta, category })
    },
    verbose: (message: string, meta: Record<string, any> = {}) => {
      rendererLogger.verbose(message, { ...meta, category })
    }
  }
}

export type RendererLogger = typeof rendererLogger
export type RendererCategoryLogger = ReturnType<typeof createRendererCategoryLogger>
