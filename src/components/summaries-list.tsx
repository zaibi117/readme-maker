"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { ChunkedFile } from "@/types/repository"

interface SummariesListProps {
  summarizedChunks: ChunkedFile[]
}

export function SummariesList({ summarizedChunks }: SummariesListProps) {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">File Summaries</CardTitle>
        <CardDescription>{summarizedChunks.length} chunks summarized</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {summarizedChunks.map((chunk) => (
              <div key={`${chunk.file}-${chunk.chunk}`} className="text-xs p-3 bg-gray-50 rounded">
                <div className="font-medium truncate">{chunk.file}</div>
                <div className="text-gray-500 mb-1">Chunk {chunk.chunk}</div>
                <p className="text-xs text-gray-700">{chunk.summary || "Processing..."}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
