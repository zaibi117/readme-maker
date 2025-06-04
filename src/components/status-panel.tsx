"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle, XCircle, Loader2, FileText, Brain, AlertTriangle } from "lucide-react"
import { SummariesList } from "./summaries-list"
import type { ProcessingStatus, ChunkedFile } from "@/types/repository"

interface StatusPanelProps {
  status: ProcessingStatus
  chunks: ChunkedFile[]
  summarizedChunks: ChunkedFile[]
}

export function StatusPanel({ status, chunks, summarizedChunks }: StatusPanelProps) {
  const getStatusIcon = () => {
    if (status.stage === "error") {
      return <XCircle className="h-4 w-4 text-red-500" />
    }
    if (status.stage === "complete") {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "complete":
        return "bg-green-100 text-green-800"
      case "error":
        return "bg-red-100 text-red-800"
      case "summarizing-chunks":
      case "generating-readme":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Processing Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-gray-500">{status.progress}%</span>
            </div>
            <Progress value={status.progress} className="w-full" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-sm font-medium">{status.message}</span>
            </div>

            <Badge variant="secondary" className={getStageColor(status.stage)}>
              {status.stage.replace("-", " ").toUpperCase()}
            </Badge>

            {status.currentFile && <div className="text-xs text-gray-500 pl-6">Current: {status.currentFile}</div>}

            {status.totalFiles && (
              <div className="text-xs text-gray-500 pl-6">
                Files: {status.processedFiles}/{status.totalFiles}
              </div>
            )}

            {status.totalChunks && (
              <div className="text-xs text-gray-500 pl-6">
                Chunks: {status.processedChunks}/{status.totalChunks}
              </div>
            )}

            {status.error && (
              <Alert className="mt-4">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{status.error}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Rate Limiting Warning */}
          {status.stage === "downloading-content" && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Using efficient batch processing to avoid GitHub rate limits. Processing up to 50 files.
              </AlertDescription>
            </Alert>
          )}

          {chunks.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Analysis Results</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    <span>{chunks.length} chunks</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Brain className="h-3 w-3" />
                    <span>{summarizedChunks.length} summarized</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {summarizedChunks.length > 0 && <SummariesList summarizedChunks={summarizedChunks} />}
    </>
  )
}
