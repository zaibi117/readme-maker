"use client"

import { useState, useEffect } from "react"
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

  const { processRepository } = useRepositoryProcessor({
    owner,
    repo,
    setStatus,
    setChunks,
    setSummarizedChunks,
    setGeneratedReadme,
    setRepoInfo,
  })

  useEffect(() => {
    if (owner && repo && authStatus !== "loading") {
      processRepository()
    }
  }, [owner, repo, authStatus, processRepository])

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
        <StatusPanel status={status} chunks={chunks} summarizedChunks={summarizedChunks} />
      </div>

      <div className="lg:col-span-2">
        <ReadmeViewer generatedReadme={generatedReadme} />
      </div>
    </div>
  )
}
