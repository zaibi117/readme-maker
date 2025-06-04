"use client"

import { useCallback } from "react"
import { useSession } from "next-auth/react"
import { GitHubService } from "@/services/github-service"
import { FileProcessor } from "@/services/file-processor"
import type { ProcessingStatus, ChunkedFile } from "@/types/repository"

interface UseRepositoryProcessorProps {
  owner: string
  repo: string
  setStatus: (status: ProcessingStatus | ((prev: ProcessingStatus) => ProcessingStatus)) => void
  setChunks: (chunks: ChunkedFile[]) => void
  setSummarizedChunks: (chunks: ChunkedFile[] | ((prev: ChunkedFile[]) => ChunkedFile[])) => void
  setGeneratedReadme: (readme: string) => void
  setRepoInfo: (info: any) => void
}

export function useRepositoryProcessor({
  owner,
  repo,
  setStatus,
  setChunks,
  setSummarizedChunks,
  setGeneratedReadme,
  setRepoInfo,
}: UseRepositoryProcessorProps) {
  const { data: session } = useSession()
  const accessToken = session?.user?.accessToken as string | undefined

  const updateStatus = useCallback(
    (update: Partial<ProcessingStatus>) => {
      setStatus((prev) => ({ ...prev, ...update }))
    },
    [setStatus],
  )

  const processRepository = useCallback(async () => {
    try {
      setChunks([])
      setSummarizedChunks([])
      setGeneratedReadme("")

      const githubService = new GitHubService(accessToken)
      const fileProcessor = new FileProcessor()

      // Fetch repository info
      updateStatus({
        stage: "fetching-tree",
        message: "Fetching repository information...",
        progress: 5,
      })

      const repoInfo = await githubService.fetchRepositoryInfo(owner, repo)
      setRepoInfo(repoInfo)

      // Step 1: Fetch repository tree (single API call)
      updateStatus({
        stage: "fetching-tree",
        message: "Fetching repository tree...",
        progress: 10,
      })

      const allFiles = await githubService.fetchRepositoryTree(owner, repo)

      // Step 2: Filter relevant files (no API calls)
      updateStatus({
        stage: "filtering-files",
        message: "Filtering relevant files...",
        progress: 20,
      })

      const relevantFiles = fileProcessor.filterRelevantFiles(allFiles)

      // Limit the number of files to process to avoid overwhelming the API
      const maxFiles = 30 // Reduced from 50 to 30 for better reliability
      const filesToProcess = relevantFiles.slice(0, maxFiles)

      if (relevantFiles.length > maxFiles) {
        updateStatus({
          stage: "filtering-files",
          message: `Limited to ${maxFiles} files (found ${relevantFiles.length} relevant files)`,
          progress: 25,
        })
      }

      // Step 3: Download file contents in efficient batches
      updateStatus({
        stage: "downloading-content",
        message: "Downloading file contents in batches...",
        progress: 30,
        totalFiles: filesToProcess.length,
        processedFiles: 0,
      })

      // Use the more efficient direct raw access method
      const filePaths = filesToProcess.map((file) => file.path)
      const fileContents = await githubService.fetchFileContentsDirectBatch(owner, repo, filePaths)

      updateStatus({
        stage: "chunking-files",
        message: "Processing and chunking files...",
        progress: 60,
      })

      // Step 4: Process and chunk all files
      const allChunks: ChunkedFile[] = []
      let processedCount = 0

      for (const [filePath, content] of fileContents.entries()) {
        try {
          const fileChunks = fileProcessor.chunkFile(filePath, content)
          allChunks.push(...fileChunks)
          processedCount++

          updateStatus({
            stage: "chunking-files",
            message: `Chunked ${processedCount}/${fileContents.size} files...`,
            progress: 60 + (processedCount / fileContents.size) * 10,
            processedFiles: processedCount,
            totalFiles: fileContents.size,
          })
        } catch (error) {
          console.error(`Failed to chunk ${filePath}:`, error)
        }
      }

      setChunks(allChunks)

      // Step 5: Summarize chunks using server-side API with smaller batches
      updateStatus({
        stage: "summarizing-chunks",
        message: "Summarizing code chunks...",
        progress: 70,
        totalChunks: allChunks.length,
        processedChunks: 0,
      })

      const summarized: ChunkedFile[] = []
      const chunkBatchSize = 3 // Reduced from 5 to 3 for better reliability
      const delayBetweenChunks = 2000 // Increased delay to 2 seconds

      for (let i = 0; i < allChunks.length; i += chunkBatchSize) {
        const chunkBatch = allChunks.slice(i, i + chunkBatchSize)

        // Send batch to server for summarization
        try {
          updateStatus({
            stage: "summarizing-chunks",
            message: `Summarizing batch ${Math.floor(i / chunkBatchSize) + 1}/${Math.ceil(allChunks.length / chunkBatchSize)}...`,
            progress: 70 + (i / allChunks.length) * 15,
            processedChunks: i,
          })

          const response = await fetch("/api/summarize-chunks", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              chunks: chunkBatch,
              accessToken,
            }),
          })

          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Server error: ${response.status} - ${errorText}`)
          }

          const { summarizedChunks } = await response.json()
          summarized.push(...summarizedChunks)

          // Update progress and state
          updateStatus({
            stage: "summarizing-chunks",
            message: `Summarized ${Math.min(i + chunkBatchSize, allChunks.length)}/${allChunks.length} chunks...`,
            progress: 70 + (Math.min(i + chunkBatchSize, allChunks.length) / allChunks.length) * 15,
            processedChunks: Math.min(i + chunkBatchSize, allChunks.length),
          })

          // Update UI incrementally
          setSummarizedChunks((prev) => [...prev, ...summarizedChunks])
        } catch (error) {
          console.error(`Failed to summarize batch ${i}:`, error)
          // Add failed chunks with error message
          const failedChunks = chunkBatch.map((chunk) => ({
            ...chunk,
            summary: `[Failed to summarize: ${error instanceof Error ? error.message : "Unknown error"}]`,
          }))
          summarized.push(...failedChunks)
          setSummarizedChunks((prev) => [...prev, ...failedChunks])
        }

        // Add delay between batches (increased)
        if (i + chunkBatchSize < allChunks.length) {
          await new Promise((resolve) => setTimeout(resolve, delayBetweenChunks))
        }
      }

      // Step 6: Generate README using server-side API
      updateStatus({
        stage: "generating-readme",
        message: "Generating README from summaries...",
        progress: 90,
      })

      try {
        const response = await fetch("/api/generate-readme", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            summaries: summarized,
            owner,
            repo,
            accessToken,
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Server error: ${response.status} - ${errorText}`)
        }

        const { readme } = await response.json()
        setGeneratedReadme(readme)
      } catch (error) {
        console.error("Failed to generate README:", error)
        // Fallback README
        const fallbackReadme = `# ${owner}/${repo}\n\n## Error Generating README\n\nFailed to generate a complete README: ${error instanceof Error ? error.message : "Unknown error"}\n\n## Available Summaries\n\n${summarized.map((chunk) => `### ${chunk.file} (Chunk ${chunk.chunk})\n\n${chunk.summary || "No summary available"}`).join("\n\n")}`
        setGeneratedReadme(fallbackReadme)
      }

      updateStatus({
        stage: "complete",
        message: "README generation complete!",
        progress: 100,
      })
    } catch (error) {
      updateStatus({
        stage: "error",
        message: "An error occurred during processing",
        progress: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }, [owner, repo, accessToken, updateStatus, setChunks, setSummarizedChunks, setGeneratedReadme, setRepoInfo])

  return { processRepository }
}
