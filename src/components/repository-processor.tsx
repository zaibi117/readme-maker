"use client"

import React from "react"

import { useState } from "react"
import { StatusPanel } from "./status-panel"
import { ReadmeViewer } from "./readme-viewer"
import { useRepositoryProcessor } from "@/hooks/use-repository-processor"
import { useSession } from "next-auth/react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import type { ProcessingStatus, ChunkedFile } from "@/types/repository"

interface RepositoryProcessorProps {
  owner: string
  repo: string
}

export function RepositoryProcessor({ owner, repo }: RepositoryProcessorProps) {
  const { status: authStatus } = useSession()
  const [status, setStatus] = useState<ProcessingStatus>({
    stage: "idle",
    message: "Ready to process repository",
    progress: 0,
  })

  const [chunks, setChunks] = useState<ChunkedFile[]>([])
  const [summarizedChunks, setSummarizedChunks] = useState<ChunkedFile[]>([])
  const [generatedReadme, setGeneratedReadme] = useState<string>("")
  const [repoInfo, setRepoInfo] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [hasCachedSummaries, setHasCachedSummaries] = useState(false)

  const { processRepository, stopProcessing, generateReadmeFromCache, loadSummariesFromCache } = useRepositoryProcessor(
    {
      owner,
      repo,
      setStatus,
      setChunks,
      setSummarizedChunks,
      setGeneratedReadme,
      setRepoInfo,
      setIsProcessing,
    },
  )

  // Check for cached summaries on component mount
  React.useEffect(() => {
    async function checkCache() {
      const { summaries } = await loadSummariesFromCache()
      setHasCachedSummaries(!!summaries && summaries.length > 0)
    }
    checkCache()
  }, [loadSummariesFromCache])

  // Don't auto-process on load anymore, wait for user to click the button
  const handleGenerateReadme = () => {
    if (!isProcessing) {
      processRepository()
    }
  }

  const handleGenerateFromCache = () => {
    if (!isProcessing && generateReadmeFromCache) {
      generateReadmeFromCache()
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {authStatus === "unauthenticated" && (
        <div className="lg:col-span-3">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You are not signed in. Processing will continue with limited access. Sign in with GitHub for better
              results and higher rate limits.
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="lg:col-span-1">
        <StatusPanel
          status={status}
          chunks={chunks}
          summarizedChunks={summarizedChunks}
          isProcessing={isProcessing}
          onStop={stopProcessing}
        />
      </div>

      <div className="lg:col-span-2">
        <ReadmeViewer
          generatedReadme={generatedReadme}
          owner={owner}
          repo={repo}
          isProcessing={isProcessing}
          onGenerateReadme={handleGenerateReadme}
          onGenerateFromCache={handleGenerateFromCache}
          hasCachedSummaries={hasCachedSummaries}
        />
      </div>
    </div>
  )
}
