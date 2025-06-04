"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import ReactMarkdown from "react-markdown"
import { Download, Eye, FileText } from "lucide-react"

interface ReadmeViewerProps {
  generatedReadme: string
}

export function ReadmeViewer({ generatedReadme }: ReadmeViewerProps) {
  const downloadReadme = () => {
    const blob = new Blob([generatedReadme], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "README.md"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            <CardTitle>Generated README</CardTitle>
          </div>
          {generatedReadme && (
            <Button onClick={downloadReadme} size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
        </div>
        <CardDescription>
          {generatedReadme ? "README generated successfully" : "README will appear here once processing is complete"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {generatedReadme ? (
          <ScrollArea className="h-[600px]">
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>{generatedReadme}</ReactMarkdown>
            </div>
          </ScrollArea>
        ) : (
          <div className="h-[600px] flex items-center justify-center text-gray-500">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>README will be generated once processing is complete</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
