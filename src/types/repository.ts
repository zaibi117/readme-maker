export interface GitHubFile {
  path: string
  mode: string
  type: string
  sha: string
  size: number
  url: string
}

export interface ChunkedFile {
  file: string
  chunk: number
  content: string
  summary?: string
}

export interface ProcessingStatus {
  stage:
  | "idle"
  | "fetching-tree"
  | "filtering-files"
  | "downloading-content"
  | "chunking-files"
  | "summarizing-chunks"
  | "generating-readme"
  | "complete"
  | "error"
  | "stopped"
  | "loading-cache"
  message: string
  progress: number
  currentFile?: string
  totalFiles?: number
  processedFiles?: number
  currentChunk?: number
  totalChunks?: number
  processedChunks?: number
  error?: string
}
