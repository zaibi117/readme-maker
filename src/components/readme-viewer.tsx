"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism"
import {
  Download,
  FileText,
  Copy,
  Check,
  RefreshCw,
  Github,
  Bot,
  AlertTriangle,
  Calendar,
  Database,
  Trash2,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"

interface ReadmeViewerProps {
  generatedReadme: string
  owner: string
  repo: string
  isProcessing: boolean
  onGenerateReadme: () => void
  onGenerateFromCache?: () => void
  hasCachedSummaries?: boolean
}

interface ReadmeData {
  generatedReadme: {
    content: string
    generatedAt: string
  } | null
  originalReadme: {
    content: string
    exists: boolean
  }
}

export function ReadmeViewer({
  generatedReadme,
  owner,
  repo,
  isProcessing,
  onGenerateReadme,
  onGenerateFromCache,
  hasCachedSummaries,
}: ReadmeViewerProps) {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<"generated" | "original">("generated")
  const [readmeData, setReadmeData] = useState<ReadmeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cacheMetadata, setCacheMetadata] = useState<any>(null)
  const [clearingCache, setClearingCache] = useState(false)
  const { data: session } = useSession()

  // Fetch README data from MongoDB and GitHub
  useEffect(() => {
    async function fetchReadmeData() {
      try {
        setLoading(true)
        setError(null)
        // @ts-ignore
        const accessToken = session?.user?.accessToken as string | undefined
        const queryParams = new URLSearchParams({
          owner,
          repo,
        })

        if (accessToken) {
          queryParams.append("accessToken", accessToken)
        }

        const response = await fetch(`/api/readme?${queryParams.toString()}`)

        if (!response.ok) {
          throw new Error(`Failed to fetch README data: ${response.statusText}`)
        }

        const data = await response.json()
        setReadmeData(data)

        // Set active tab based on what's available
        if (data.originalReadme?.exists) {
          setActiveTab("original")
        } else if (data.generatedReadme) {
          setActiveTab("generated")
        }
      } catch (err) {
        console.error("Error fetching README data:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch README data")
      } finally {
        setLoading(false)
      }
    }

    if (owner && repo) {
      fetchReadmeData()
    }
  }, [owner, repo, session])

  // Check for cached summaries
  useEffect(() => {
    async function checkCachedSummaries() {
      try {
        const response = await fetch(`/api/summary-cache?owner=${owner}&repo=${repo}`)
        if (response.ok) {
          const data = await response.json()
          if (data.cached) {
            setCacheMetadata(data.metadata)
          }
        }
      } catch (error) {
        console.error("Error checking cached summaries:", error)
      }
    }

    if (owner && repo) {
      checkCachedSummaries()
    }
  }, [owner, repo])

  // Save generated README to MongoDB
  useEffect(() => {
    async function saveGeneratedReadme() {
      if (!generatedReadme || !owner || !repo) return

      try {
        // @ts-ignore
        const accessToken = session?.user?.accessToken as string | undefined
        const response = await fetch("/api/readme", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            owner,
            repo,
            readmeContent: generatedReadme,
            accessToken,
          }),
        })

        if (!response.ok) {
          console.error("Failed to save README to database:", response.statusText)
          return
        }

        // Update the local state with the new generated README
        setReadmeData((prev) => {
          if (!prev) return null
          return {
            ...prev,
            generatedReadme: {
              content: generatedReadme,
              generatedAt: new Date().toISOString(),
            },
          }
        })

        // Switch to the generated tab
        setActiveTab("generated")
      } catch (err) {
        console.error("Error saving README:", err)
      }
    }

    if (generatedReadme) {
      saveGeneratedReadme()
    }
  }, [generatedReadme, owner, repo, session])

  const clearCache = async () => {
    try {
      setClearingCache(true)
      const response = await fetch(`/api/summary-cache?owner=${owner}&repo=${repo}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setCacheMetadata(null)
        console.log("Cache cleared successfully")
      } else {
        console.error("Failed to clear cache:", response.statusText)
      }
    } catch (error) {
      console.error("Error clearing cache:", error)
    } finally {
      setClearingCache(false)
    }
  }

  const downloadReadme = () => {
    let content = ""
    if (activeTab === "generated") {
      content = readmeData?.generatedReadme?.content || generatedReadme
    } else {
      content = readmeData?.originalReadme?.content || ""
    }

    if (!content) return

    const blob = new Blob([content], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "README.md"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const copyToClipboard = async () => {
    let content = ""
    if (activeTab === "generated") {
      content = readmeData?.generatedReadme?.content || generatedReadme
    } else {
      content = readmeData?.originalReadme?.content || ""
    }

    if (!content) return

    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = content
      textArea.style.position = "fixed"
      textArea.style.left = "-999999px"
      textArea.style.top = "-999999px"
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Determine what content to show
  const getActiveContent = () => {
    if (activeTab === "generated") {
      // If we have a newly generated README, show it
      if (generatedReadme) {
        return generatedReadme
      }
      // Otherwise show the one from the database
      return readmeData?.generatedReadme?.content || ""
    } else {
      // Show original README
      return readmeData?.originalReadme?.content || ""
    }
  }

  const renderReadmeContent = (content: string) => {
    if (!content) {
      return (
        <div className="h-[600px] flex items-center justify-center text-muted-foreground border rounded-md bg-muted">
          <div className="text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted" />
            <p className="text-lg font-medium text-foreground mb-2">No README Available</p>
            <p className="text-sm text-muted-foreground">
              {activeTab === "original"
                ? "This repository doesn't have an original README file"
                : "No generated README available"}
            </p>
          </div>
        </div>
      )
    }

    return (
      <Tabs defaultValue="preview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="markdown">Raw Markdown</TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="mt-4">
          <ScrollArea className="h-[600px] border rounded-md p-4 bg-background">
            <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-strong:text-foreground prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
              <ReactMarkdown
                components={{
                  // @ts-ignore
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "")
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={tomorrow}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-md"
                        {...props}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    ) : (
                      <code className="bg-muted text-primary px-1 py-0.5 rounded text-sm font-mono" {...props}>
                        {children}
                      </code>
                    )
                  },
                  h1: ({ children }) => (
                    <h1 className="text-3xl font-bold mb-6 text-foreground border-b border-border pb-2">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-2xl font-semibold mb-4 mt-8 text-foreground border-b border-border pb-1">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => <h3 className="text-xl font-medium mb-3 mt-6 text-foreground">{children}</h3>,
                  h4: ({ children }) => <h4 className="text-lg font-medium mb-2 mt-4 text-foreground">{children}</h4>,
                  p: ({ children }) => <p className="mb-4 text-muted-foreground leading-relaxed">{children}</p>,
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside mb-4 space-y-2 text-muted-foreground ml-4">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside mb-4 space-y-2 text-muted-foreground ml-4">{children}</ol>
                  ),
                  li: ({ children }) => <li className="text-muted-foreground">{children}</li>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground my-4 bg-secondary py-2 rounded-r">
                      {children}
                    </blockquote>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      className="text-primary hover:text-primary/80 underline hover:no-underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-4">
                      <table className="min-w-full border border-border rounded-lg">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
                  tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
                  tr: ({ children }) => <tr>{children}</tr>,
                  th: ({ children }) => (
                    <th className="px-4 py-2 text-left text-sm font-medium text-foreground border-b border-border">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-4 py-2 text-sm text-muted-foreground border-b border-border">{children}</td>
                  ),
                  pre: ({ children }) => (
                    <pre className="bg-foreground text-background p-4 rounded-lg overflow-x-auto my-4">{children}</pre>
                  ),
                  hr: () => <hr className="my-6 border-border" />,
                  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                  em: ({ children }) => <em className="italic text-muted-foreground">{children}</em>,
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="markdown" className="mt-4">
          <ScrollArea className="h-[600px] border rounded-md bg-muted">
            <pre className="p-4 text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">{content}</pre>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    )
  }

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Loading README...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Error Loading README
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle>README</CardTitle>
          </div>
          <div className="flex gap-2">
            {getActiveContent() && (
              <>
                <Button onClick={copyToClipboard} size="sm" variant="outline">
                  {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
                <Button onClick={downloadReadme} size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </>
            )}
            {cacheMetadata && onGenerateFromCache && (
              <Button
                onClick={onGenerateFromCache}
                size="sm"
                disabled={isProcessing}
                variant="outline"
                className="border-green-200 text-green-700 hover:bg-green-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Use Cached
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={onGenerateReadme}
              size="sm"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Bot className="h-4 w-4 mr-2" />
                  Generate README
                </>
              )}
            </Button>
          </div>
        </div>
        <CardDescription>
          View and generate README files for {owner}/{repo}
        </CardDescription>

        {/* Cache info alert */}
        {cacheMetadata && (
          <Alert className="mt-4">
            <Database className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <div>
                  Cached summaries available ({cacheMetadata.successfulChunks} summaries from{" "}
                  {format(new Date(cacheMetadata.updatedAt), "MMM d, yyyy")})
                </div>
                <Button
                  onClick={clearCache}
                  size="sm"
                  variant="ghost"
                  disabled={clearingCache}
                  className="text-destructive hover:text-destructive"
                >
                  {clearingCache ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="mt-4">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "generated" | "original")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="original" disabled={!readmeData?.originalReadme?.exists}>
                <div className="flex items-center gap-1">
                  <Github className="h-4 w-4" />
                  <span>Original README</span>
                  {!readmeData?.originalReadme?.exists && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      Not Found
                    </Badge>
                  )}
                </div>
              </TabsTrigger>
              <TabsTrigger value="generated" disabled={!readmeData?.generatedReadme && !generatedReadme}>
                <div className="flex items-center gap-1">
                  <Bot className="h-4 w-4" />
                  <span>Generated README</span>
                  {!readmeData?.generatedReadme && !generatedReadme && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      Not Generated
                    </Badge>
                  )}
                </div>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent>
        {renderReadmeContent(getActiveContent())}

        {copied && (
          <Alert className="mt-4">
            <Check className="h-4 w-4" />
            <AlertDescription>README copied to clipboard successfully!</AlertDescription>
          </Alert>
        )}
      </CardContent>

      {activeTab === "generated" && readmeData?.generatedReadme && (
        <CardFooter className="border-t pt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>
              Generated on {format(new Date(readmeData.generatedReadme.generatedAt), "MMM d, yyyy 'at' h:mm a")}
            </span>
          </div>
        </CardFooter>
      )}
    </Card>
  )
}
