"use client"

import { useCallback, useRef } from "react"
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
  setIsProcessing: (isProcessing: boolean) => void
}

export function useRepositoryProcessor({
  owner,
  repo,
  setStatus,
  setChunks,
  setSummarizedChunks,
  setGeneratedReadme,
  setRepoInfo,
  setIsProcessing,
}: UseRepositoryProcessorProps) {
  const { data: session } = useSession()
  // @ts-ignore
  const accessToken = session?.user?.accessToken as string | undefined
  const abortControllerRef = useRef<AbortController | null>(null)
  const shouldStopRef = useRef(false)

  const updateStatus = useCallback(
    (update: Partial<ProcessingStatus>) => {
      setStatus((prev) => ({ ...prev, ...update }))
    },
    [setStatus],
  )

  const stopProcessing = useCallback(() => {
    console.log("Stop processing requested")
    shouldStopRef.current = true
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setIsProcessing(false)
    updateStatus({
      stage: "stopped",
      message: "Processing stopped by user",
      progress: 0,
    })
  }, [updateStatus, setIsProcessing])

  // New function to save summaries to cache
  const saveSummariesToCache = useCallback(
    async (summaries: ChunkedFile[], stats: { total: number; successful: number; skipped: number }) => {
      try {
        console.log("Saving summaries to cache...")
        const response = await fetch("/api/summary-cache", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            owner,
            repo,
            summaries,
            stats,
          }),
        })

        if (response.ok) {
          console.log("Summaries saved to cache successfully")
        } else {
          console.error("Failed to save summaries to cache:", response.statusText)
        }
      } catch (error) {
        console.error("Error saving summaries to cache:", error)
      }
    },
    [owner, repo],
  )

  // New function to load summaries from cache
  const loadSummariesFromCache = useCallback(async (): Promise<{
    summaries: ChunkedFile[] | null
    metadata: any
  }> => {
    try {
      console.log("Checking for cached summaries...")
      const response = await fetch(`/api/summary-cache?owner=${owner}&repo=${repo}`)

      if (!response.ok) {
        console.log("No cached summaries found")
        return { summaries: null, metadata: null }
      }

      const data = await response.json()

      if (data.cached && data.summaries) {
        console.log(`Found ${data.summaries.length} cached summaries`)
        return { summaries: data.summaries, metadata: data.metadata }
      }

      return { summaries: null, metadata: null }
    } catch (error) {
      console.error("Error loading cached summaries:", error)
      return { summaries: null, metadata: null }
    }
  }, [owner, repo])

  // New function to generate README from cached summaries
  const generateReadmeFromCache = useCallback(async () => {
    try {
      console.log("Generating README from cached summaries...")
      shouldStopRef.current = false
      abortControllerRef.current = new AbortController()
      setIsProcessing(true)

      updateStatus({
        stage: "loading-cache",
        message: "Loading cached summaries...",
        progress: 10,
      })

      const { summaries: cachedSummaries, metadata } = await loadSummariesFromCache()

      if (!cachedSummaries || cachedSummaries.length === 0) {
        throw new Error("No cached summaries found")
      }

      if (shouldStopRef.current) return

      // Set the cached summaries in the UI
      setSummarizedChunks(cachedSummaries)

      updateStatus({
        stage: "generating-readme",
        message: `Generating README from ${cachedSummaries.length} cached summaries...`,
        progress: 50,
      })

      if (shouldStopRef.current) return

      // Generate README using cached summaries
      const response = await fetch("/api/generate-readme", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summaries: cachedSummaries,
          owner,
          repo,
          accessToken,
        }),
        signal: abortControllerRef.current?.signal,
      })

      if (shouldStopRef.current) return

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Server error: ${response.status} - ${errorText}`)
      }

      const responseData = await response.json()

      if (responseData.readme) {
        setGeneratedReadme(responseData.readme)
        updateStatus({
          stage: "complete",
          message: `README generated from cached summaries! (${metadata?.successfulChunks || cachedSummaries.length} summaries used)`,
          progress: 100,
        })
      } else {
        throw new Error("No README content in response")
      }

      setIsProcessing(false)
    } catch (error) {
      console.error("Error generating README from cache:", error)
      updateStatus({
        stage: "error",
        message: "Failed to generate README from cached summaries",
        progress: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      })
      setIsProcessing(false)
    }
  }, [
    owner,
    repo,
    accessToken,
    loadSummariesFromCache,
    setSummarizedChunks,
    setGeneratedReadme,
    updateStatus,
    setIsProcessing,
  ])

  const processRepository = useCallback(async () => {
    try {
      console.log("Starting repository processing")
      shouldStopRef.current = false
      abortControllerRef.current = new AbortController()
      setIsProcessing(true)

      setChunks([])
      setSummarizedChunks([])
      setGeneratedReadme("")

      const githubService = new GitHubService(accessToken)
      const fileProcessor = new FileProcessor()

      // Check if stopped
      if (shouldStopRef.current) {
        console.log("Processing stopped at start")
        return
      }

      // Fetch repository info
      updateStatus({
        stage: "fetching-tree",
        message: "Fetching repository information...",
        progress: 5,
      })

      const repoInfo = await githubService.fetchRepositoryInfo(owner, repo)
      setRepoInfo(repoInfo)

      if (shouldStopRef.current) {
        console.log("Processing stopped after repo info")
        return
      }

      // Step 1: Fetch repository tree (single API call)
      updateStatus({
        stage: "fetching-tree",
        message: "Fetching repository tree...",
        progress: 10,
      })

      const allFiles = await githubService.fetchRepositoryTree(owner, repo)

      if (shouldStopRef.current) {
        console.log("Processing stopped after tree fetch")
        return
      }

      // Step 2: Filter relevant files (no API calls)
      updateStatus({
        stage: "filtering-files",
        message: "Filtering relevant files...",
        progress: 20,
      })

      const relevantFiles = fileProcessor.filterRelevantFiles(allFiles)

      // Limit the number of files to process to avoid overwhelming the API
      const maxFiles = 30
      const filesToProcess = relevantFiles.slice(0, maxFiles)

      if (relevantFiles.length > maxFiles) {
        updateStatus({
          stage: "filtering-files",
          message: `Limited to ${maxFiles} files (found ${relevantFiles.length} relevant files)`,
          progress: 25,
        })
      }

      if (shouldStopRef.current) {
        console.log("Processing stopped after filtering")
        return
      }

      // Step 3: Download file contents in efficient batches
      updateStatus({
        stage: "downloading-content",
        message: "Downloading file contents in batches...",
        progress: 30,
        totalFiles: filesToProcess.length,
        processedFiles: 0,
      })

      const filePaths = filesToProcess.map((file) => file.path)
      const fileContents = await githubService.fetchFileContentsDirectBatch(owner, repo, filePaths)

      if (shouldStopRef.current) {
        console.log("Processing stopped after content download")
        return
      }

      updateStatus({
        stage: "chunking-files",
        message: "Processing and chunking files...",
        progress: 60,
      })

      // Step 4: Process and chunk all files
      const allChunks: ChunkedFile[] = []
      let processedCount = 0

      for (const [filePath, content] of fileContents.entries()) {
        if (shouldStopRef.current) {
          console.log("Processing stopped during chunking")
          return
        }

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
            currentFile: filePath,
          })
        } catch (error) {
          console.error(`Failed to chunk ${filePath}:`, error)
        }
      }

      setChunks(allChunks)

      if (shouldStopRef.current) {
        console.log("Processing stopped after chunking")
        return
      }

      // Step 5: Summarize chunks using server-side API with rate limiting
      updateStatus({
        stage: "summarizing-chunks",
        message: "Summarizing code chunks (rate limited: 15 requests/minute)...",
        progress: 70,
        totalChunks: allChunks.length,
        processedChunks: 0,
      })

      const summarized: ChunkedFile[] = []
      const chunkBatchSize = 2 // Reduced batch size to respect rate limits better
      const delayBetweenChunks = 1000 // Reduced delay since rate limiter handles timing
      let totalSkipped = 0

      for (let i = 0; i < allChunks.length; i += chunkBatchSize) {
        if (shouldStopRef.current) {
          console.log("Processing stopped during summarization")
          return
        }

        const chunkBatch = allChunks.slice(i, i + chunkBatchSize)

        try {
          updateStatus({
            stage: "summarizing-chunks",
            message: `Summarizing batch ${Math.floor(i / chunkBatchSize) + 1}/${Math.ceil(allChunks.length / chunkBatchSize)} (rate limited)...`,
            progress: 70 + (i / allChunks.length) * 15,
            processedChunks: i,
            currentFile: chunkBatch[0]?.file,
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
            signal: abortControllerRef.current?.signal,
          })

          if (shouldStopRef.current) {
            console.log("Processing stopped during API call")
            return
          }

          if (!response.ok) {
            const errorText = await response.text()
            console.error("Summarization API error:", errorText)
            throw new Error(`Server error: ${response.status} - ${errorText}`)
          }

          const { summarizedChunks, stats, rateLimitInfo } = await response.json()

          // Only add chunks that were successfully processed (not skipped)
          if (summarizedChunks && summarizedChunks.length > 0) {
            summarized.push(...summarizedChunks)
            setSummarizedChunks((prev) => [...prev, ...summarizedChunks])
          }

          // Track skipped chunks
          if (stats?.skipped) {
            totalSkipped += stats.skipped
          }

          // Log rate limit info and stats
          if (rateLimitInfo) {
            console.log(
              `Rate limit: ${rateLimitInfo.remaining} requests remaining, reset in ${Math.ceil(rateLimitInfo.resetTime / 1000)}s`,
            )
          }

          if (stats) {
            console.log(`Batch stats: ${stats.successful} successful, ${stats.skipped} skipped, ${stats.failed} failed`)
          }

          updateStatus({
            stage: "summarizing-chunks",
            message: `Processed ${Math.min(i + chunkBatchSize, allChunks.length)}/${allChunks.length} chunks (${totalSkipped} skipped)...`,
            progress: 70 + (Math.min(i + chunkBatchSize, allChunks.length) / allChunks.length) * 15,
            processedChunks: Math.min(i + chunkBatchSize, allChunks.length),
          })
        } catch (error) {
          if (shouldStopRef.current) {
            console.log("Processing stopped due to error during summarization")
            return
          }

          console.error(`Failed to summarize batch ${i}:`, error)

          // For batch-level errors, we'll skip the entire batch
          console.log(`Skipping entire batch ${i} due to error: ${(error as Error).message}`)
          totalSkipped += chunkBatch.length
        }

        if (i + chunkBatchSize < allChunks.length && !shouldStopRef.current) {
          await new Promise((resolve) => setTimeout(resolve, delayBetweenChunks))
        }
      }

      if (shouldStopRef.current) {
        console.log("Processing stopped before caching summaries")
        return
      }

      // Save summaries to cache after successful summarization
      if (summarized.length > 0) {
        await saveSummariesToCache(summarized, {
          total: allChunks.length,
          successful: summarized.length,
          skipped: totalSkipped,
        })
      }

      // Only proceed with README generation if we have some successful summaries
      if (summarized.length === 0) {
        console.warn("No chunks were successfully summarized, generating basic README")
        const basicReadme = `# ${owner}/${repo}

## Overview

This repository has been automatically analyzed, but detailed code summaries could not be generated due to API limitations.

## Getting Started

Please refer to the code files directly for implementation details and usage instructions.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

Please check the repository for license information.`

        setGeneratedReadme(basicReadme)

        updateStatus({
          stage: "complete",
          message: `README generation complete! (${totalSkipped} chunks skipped due to API errors)`,
          progress: 100,
        })
        setIsProcessing(false)
        return
      }

      if (shouldStopRef.current) {
        console.log("Processing stopped before README generation")
        return
      }

      // Step 6: Generate README using server-side API with rate limiting
      updateStatus({
        stage: "generating-readme",
        message: "Generating README from summaries (rate limited)...",
        progress: 90,
      })

      try {
        console.log("Calling README generation API...")
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
          signal: abortControllerRef.current?.signal,
        })

        if (shouldStopRef.current) {
          console.log("Processing stopped during README generation")
          return
        }

        console.log("README API response status:", response.status)

        if (!response.ok) {
          const errorText = await response.text()
          console.error("README generation API error:", errorText)
          throw new Error(`Server error: ${response.status} - ${errorText}`)
        }

        const responseData = await response.json()
        console.log("README API response received")

        // Log rate limit info
        if (responseData.rateLimitInfo) {
          console.log(`Rate limit after README: ${responseData.rateLimitInfo.remaining} requests remaining`)
        }

        if (responseData.readme) {
          setGeneratedReadme(responseData.readme)
        } else {
          throw new Error("No README content in response")
        }
      } catch (error) {
        if (shouldStopRef.current) {
          console.log("Processing stopped due to README generation error")
          return
        }

        console.error("Failed to generate README:", error)

        // Show error but keep the cached summaries available for retry
        updateStatus({
          stage: "error",
          message: "README generation failed, but summaries are cached for retry",
          progress: 90,
          error: error instanceof Error ? error.message : "Unknown error",
        })
        setIsProcessing(false)
        return
      }

      if (!shouldStopRef.current) {
        const finalMessage =
          totalSkipped > 0
            ? `README generation complete! (${totalSkipped} chunks skipped due to API errors)`
            : "README generation complete!"

        updateStatus({
          stage: "complete",
          message: finalMessage,
          progress: 100,
        })
        setIsProcessing(false)
        console.log("Processing completed successfully")
      }
    } catch (error) {
      if (!shouldStopRef.current) {
        console.error("Processing error:", error)
        updateStatus({
          stage: "error",
          message: "Processing failed - check if cached summaries are available for retry",
          progress: 0,
          error: error instanceof Error ? error.message : "Unknown error",
        })
        setIsProcessing(false)
      }
    }
  }, [
    owner,
    repo,
    accessToken,
    updateStatus,
    setChunks,
    setSummarizedChunks,
    setGeneratedReadme,
    setRepoInfo,
    saveSummariesToCache,
    setIsProcessing,
  ])

  return { processRepository, stopProcessing, generateReadmeFromCache, loadSummariesFromCache }
}
