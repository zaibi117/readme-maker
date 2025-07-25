"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  Brain,
  AlertTriangle,
  StopCircle,
  Timer,
  SkipForward,
  Database,
  RefreshCw,
  Crown,
  Zap,
  AlertCircle,
  Info,
} from "lucide-react"
import { SummariesList } from "./summaries-list"
import type { ProcessingStatus, ChunkedFile } from "@/types/repository"
import { useSession } from "next-auth/react"

interface StatusPanelProps {
  status: ProcessingStatus
  chunks: ChunkedFile[]
  summarizedChunks: ChunkedFile[]
  isProcessing: boolean
  onStop: () => void
  onRetryFromCache?: () => void
  cacheMetadata?: any
}

export function StatusPanel({
  status,
  chunks,
  summarizedChunks,
  isProcessing,
  onStop,
  onRetryFromCache,
  cacheMetadata,
}: StatusPanelProps) {
  const getStatusIcon = () => {
    if (status.stage === "error") {
      return <XCircle className="h-4 w-4 text-red-500" />
    }
    if (status.stage === "complete") {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    if (status.stage === "stopped") {
      return <StopCircle className="h-4 w-4 text-orange-500" />
    }
    return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "complete":
        return "bg-green-100 text-green-800 border-green-200"
      case "error":
        return "bg-red-100 text-red-800 border-red-200"
      case "stopped":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "summarizing-chunks":
      case "generating-readme":
        return "bg-blue-100 text-blue-800 border-blue-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getErrorSeverity = (error: string) => {
    if (error.includes("rate limit") || error.includes("Daily limit exceeded")) {
      return "warning"
    }
    if (error.includes("network") || error.includes("timeout")) {
      return "info"
    }
    return "error"
  }

  const getErrorIcon = (severity: string) => {
    switch (severity) {
      case "warning":
        return <AlertTriangle className="h-4 w-4" />
      case "info":
        return <Info className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const canStop = isProcessing && !["complete", "error", "stopped"].includes(status.stage)

  // Check if there are skipped chunks mentioned in the status message
  const hasSkippedChunks = status.message.includes("skipped")
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
              <span className="text-sm text-muted-foreground">{status.progress}%</span>
            </div>
            <Progress value={status.progress} className="w-full h-2" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-sm font-medium">{status.message}</span>
            </div>

            <div className="flex items-center justify-between">
              <Badge variant="secondary" className={`${getStageColor(status.stage)} border`}>
                {status.stage.replace("-", " ").toUpperCase()}
              </Badge>

              {canStop && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onStop}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                >
                  <StopCircle className="h-3 w-3 mr-1" />
                  Stop Processing
                </Button>
              )}
            </div>

            {status.currentFile && (
              <div className="text-xs text-muted-foreground pl-6 bg-muted p-2 rounded">
                <span className="font-medium">Current file:</span> {status.currentFile}
              </div>
            )}

            {status.totalFiles && (
              <div className="text-xs text-muted-foreground pl-6">
                <span className="font-medium">Files:</span> {status.processedFiles}/{status.totalFiles}
              </div>
            )}

            {status.totalChunks && (
              <div className="text-xs text-muted-foreground pl-6">
                <span className="font-medium">Chunks:</span> {status.processedChunks}/{status.totalChunks}
              </div>
            )}

            {hasSkippedChunks && (
              <Alert className="mt-4 border-yellow-200 bg-yellow-50">
                <SkipForward className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-800">Some chunks were skipped</AlertTitle>
                <AlertDescription className="text-yellow-800">
                  Some chunks were skipped due to API errors (overloaded servers, timeouts, etc.). Processing continues
                  with available data. This is normal and doesn't affect the final result quality.
                </AlertDescription>
              </Alert>
            )}

            {status.error && (
              <Alert
                className={`mt-4 ${getErrorSeverity(status.error) === "warning"
                  ? "border-yellow-200 bg-yellow-50"
                  : getErrorSeverity(status.error) === "info"
                    ? "border-blue-200 bg-blue-50"
                    : "border-red-200 bg-red-50"
                  }`}
              >
                {getErrorIcon(getErrorSeverity(status.error))}
                <AlertTitle
                  className={
                    getErrorSeverity(status.error) === "warning"
                      ? "text-yellow-800"
                      : getErrorSeverity(status.error) === "info"
                        ? "text-blue-800"
                        : "text-red-800"
                  }
                >
                  {getErrorSeverity(status.error) === "warning"
                    ? "Processing Limited"
                    : getErrorSeverity(status.error) === "info"
                      ? "Temporary Issue"
                      : "Processing Error"}
                </AlertTitle>
                <AlertDescription
                  className={
                    getErrorSeverity(status.error) === "warning"
                      ? "text-yellow-800"
                      : getErrorSeverity(status.error) === "info"
                        ? "text-blue-800"
                        : "text-red-800"
                  }
                >
                  {status.error}
                  {status.error.includes("Daily limit exceeded") && (
                    <div className="mt-2">
                      <Button size="sm" variant="outline" className="text-yellow-700 border-yellow-300">
                        <Crown className="h-3 w-3 mr-1" />
                        Upgrade to Premium
                      </Button>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {status.stage === "error" && cacheMetadata && onRetryFromCache && (
              <div className="mt-4">
                <Button
                  onClick={onRetryFromCache}
                  size="sm"
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4 mr-2" />
                      Retry from Cache
                    </>
                  )}
                </Button>
              </div>
            )}

            {status.stage === "stopped" && (
              <Alert className="mt-4 border-orange-200 bg-orange-50">
                <StopCircle className="h-4 w-4 text-orange-600" />
                <AlertTitle className="text-orange-800">Processing Stopped</AlertTitle>
                <AlertDescription className="text-orange-800">
                  Processing was stopped by user. You can refresh the page to start over or try generating from cache if
                  available.
                </AlertDescription>
              </Alert>
            )}
          </div>


          {/* Rate Limiting Info */}
          {(status.stage === "summarizing-chunks" || status.stage === "generating-readme") && (
            <Alert className="border-blue-200 bg-blue-50">
              <Timer className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">Processing Information</AlertTitle>
              <AlertDescription className="text-xs text-blue-800">
                <div className="space-y-1">
                  <div>Rate limiting: Max 15 Gemini API requests per minute</div>
                  <div>Failed chunks are automatically skipped to ensure progress</div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Rate Limiting Warning */}
          {status.stage === "downloading-content" && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Efficient Processing</AlertTitle>
              <AlertDescription className="text-xs text-amber-800">
                Using efficient batch processing to avoid GitHub rate limits. Processing up to 30 files for optimal
                performance.
              </AlertDescription>
            </Alert>
          )}

          {chunks.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Analysis Results</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1 bg-blue-50 p-2 rounded">
                    <FileText className="h-3 w-3 text-blue-600" />
                    <span className="text-blue-800">{chunks.length} chunks</span>
                  </div>
                  <div className="flex items-center gap-1 bg-green-50 p-2 rounded">
                    <Brain className="h-3 w-3 text-green-600" />
                    <span className="text-green-800">{summarizedChunks.length} summarized</span>
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
