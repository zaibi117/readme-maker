import type { GitHubFile, ChunkedFile } from "@/types/repository"
import { IGNORED_DIRECTORIES, IGNORED_FILES, BINARY_EXTENSIONS, CODE_EXTENSIONS } from "@/constants/file-filters"

export class FileProcessor {
  filterRelevantFiles(files: GitHubFile[]): GitHubFile[] {
    return files
      .filter((file) => {
        const filename = file.path.split("/").pop() || ""

        // Check if file is in ignored directory
        const isInIgnoredDir = IGNORED_DIRECTORIES.some(
          (dir) => file.path.includes(`${dir}/`) || file.path.startsWith(`${dir}/`),
        )
        if (isInIgnoredDir) return false

        // Check if file is specifically ignored
        if (IGNORED_FILES.includes(filename)) return false

        // Check if file has binary extension
        const hasBinaryExtension = BINARY_EXTENSIONS.some((ext) => filename.toLowerCase().endsWith(ext))
        if (hasBinaryExtension) return false

        // Include files with code extensions or no extension (like Dockerfile, Makefile)
        const hasCodeExtension = CODE_EXTENSIONS.some((ext) => filename.toLowerCase().endsWith(ext))

        // Skip files larger than 500KB to reduce processing time
        if (file.size > 500000) return false

        return hasCodeExtension || !filename.includes(".")
      })
      .sort((a, b) => {
        // Prioritize important files
        const importantFiles = ["README.md", "package.json", "index.js", "index.ts", "main.py", "app.py"]
        const aImportant = importantFiles.some((important) => a.path.endsWith(important))
        const bImportant = importantFiles.some((important) => b.path.endsWith(important))

        if (aImportant && !bImportant) return -1
        if (!aImportant && bImportant) return 1

        // Then sort by file size (smaller files first for faster processing)
        return a.size - b.size
      })
  }

  chunkFile(filePath: string, content: string): ChunkedFile[] {
    const lines = content.split("\n")

    // For very small files (under 100 lines), return as single chunk
    if (lines.length <= 100) {
      return [
        {
          file: filePath,
          chunk: 1,
          content: content,
        },
      ]
    }

    // For medium files (100-300 lines), be more conservative with chunking
    if (lines.length <= 300) {
      return [
        {
          file: filePath,
          chunk: 1,
          content: content,
        },
      ]
    }

    // For larger files, split into logical chunks but with smaller max size
    const chunks: ChunkedFile[] = []
    let chunkNumber = 1
    let currentChunk: string[] = []
    let braceLevel = 0
    let inFunction = false
    let inClass = false
    let inComponent = false

    const maxChunkSize = 150 // Reduced from 250 to create smaller chunks

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmedLine = line.trim()

      // Track code structure for intelligent splitting
      if (trimmedLine.includes("{")) {
        braceLevel += (trimmedLine.match(/\{/g) || []).length
      }
      if (trimmedLine.includes("}")) {
        braceLevel -= (trimmedLine.match(/\}/g) || []).length
      }

      // Detect function/class/component boundaries
      if (this.isFunctionStart(trimmedLine)) inFunction = true
      if (this.isClassStart(trimmedLine)) inClass = true
      if (this.isComponentStart(trimmedLine)) inComponent = true

      currentChunk.push(line)

      // Check if we should split the chunk (more aggressive splitting)
      const shouldSplit =
        currentChunk.length >= 80 && // Reduced from 150
        currentChunk.length <= 120 && // Reduced from 200
        braceLevel === 0 &&
        !inFunction &&
        !inClass &&
        !inComponent &&
        (trimmedLine === "" || trimmedLine.startsWith("//") || trimmedLine.startsWith("/*"))

      if (shouldSplit || currentChunk.length >= maxChunkSize) {
        if (currentChunk.length > 0) {
          chunks.push({
            file: filePath,
            chunk: chunkNumber++,
            content: currentChunk.join("\n"),
          })
          currentChunk = []
        }

        // Reset tracking variables
        inFunction = false
        inClass = false
        inComponent = false
      }

      // Reset function/class/component tracking when they end
      if (braceLevel === 0) {
        inFunction = false
        inClass = false
        inComponent = false
      }
    }

    // Add remaining lines as final chunk
    if (currentChunk.length > 0) {
      chunks.push({
        file: filePath,
        chunk: chunkNumber,
        content: currentChunk.join("\n"),
      })
    }

    return chunks
  }

  private isFunctionStart(line: string): boolean {
    const functionPatterns = [
      /^(export\s+)?(async\s+)?function\s+/,
      /^(export\s+)?const\s+\w+\s*=\s*(async\s+)?\(/,
      /^(export\s+)?const\s+\w+\s*=\s*(async\s+)?\w+\s*=>/,
      /^(public|private|protected)\s+\w+\s*\(/,
      /^def\s+\w+/, // Python
      /^(public|private|protected)?\s*(static\s+)?\w+\s+\w+\s*\(/, // Java/C#
    ]

    return functionPatterns.some((pattern) => pattern.test(line))
  }

  private isClassStart(line: string): boolean {
    const classPatterns = [
      /^(export\s+)?(abstract\s+)?class\s+/,
      /^class\s+\w+/,
      /^(public|private|protected)?\s*class\s+/,
    ]

    return classPatterns.some((pattern) => pattern.test(line))
  }

  private isComponentStart(line: string): boolean {
    const componentPatterns = [
      /^(export\s+)?(default\s+)?function\s+[A-Z]\w*\s*\(/,
      /^(export\s+)?const\s+[A-Z]\w*\s*=\s*\(/,
      /^(export\s+)?const\s+[A-Z]\w*\s*:\s*React\.FC/,
      /^(export\s+)?const\s+[A-Z]\w*\s*=\s*React\.memo\(/,
    ]

    return componentPatterns.some((pattern) => pattern.test(line))
  }
}
