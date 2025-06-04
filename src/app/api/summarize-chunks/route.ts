import { type NextRequest, NextResponse } from "next/server"
import type { ChunkedFile } from "@/types/repository"

interface SummarizeRequest {
  chunks: ChunkedFile[]
  accessToken?: string // GitHub access token
}

// Helper function to add delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Helper function to retry API calls
async function retryApiCall<T>(apiCall: () => Promise<T>, maxRetries = 3, baseDelay = 1000): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall()
    } catch (error) {
      lastError = error as Error
      console.warn(`API call attempt ${attempt} failed:`, error)

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delayTime = baseDelay * Math.pow(2, attempt - 1)
        console.log(`Retrying in ${delayTime}ms...`)
        await delay(delayTime)
      }
    }
  }

  throw lastError!
}

export async function POST(req: NextRequest) {
  try {
    const body: SummarizeRequest = await req.json()
    const { chunks, accessToken } = body

    if (!chunks || !Array.isArray(chunks)) {
      return NextResponse.json({ error: "Invalid chunks data" }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 })
    }

    console.log(`Processing ${chunks.length} chunks for summarization`)
    const summarizedChunks: ChunkedFile[] = []

    // Process chunks sequentially to avoid rate limiting
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      console.log(`Processing chunk ${i + 1}/${chunks.length}: ${chunk.file} (chunk ${chunk.chunk})`)

      try {
        const summary = await retryApiCall(async () => {
          const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey,
              },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: `Analyze and summarize this code snippet from file "${chunk.file}" (chunk ${chunk.chunk}). 

Focus on:
- What this code does (main functionality)
- Key functions, classes, or components
- Important logic or algorithms
- Dependencies or imports used

Keep the summary concise (2-4 sentences) and technical.

Code:
\`\`\`
${chunk.content}
\`\`\``,
                      },
                    ],
                  },
                ],
                generationConfig: {
                  temperature: 0.1,
                  topK: 1,
                  topP: 1,
                  maxOutputTokens: 200,
                },
                safetySettings: [
                  {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                  },
                  {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                  },
                  {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                  },
                  {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE",
                  },
                ],
              }),
            },
          )

          if (!response.ok) {
            const errorText = await response.text()
            console.error(`Gemini API error ${response.status}:`, errorText)
            throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
          }

          const data = await response.json()

          if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            console.error("Invalid response structure:", data)
            throw new Error("Invalid response structure from Gemini API")
          }

          return data.candidates[0].content.parts[0].text
        })

        summarizedChunks.push({
          ...chunk,
          summary,
        })

        console.log(`Successfully summarized chunk ${i + 1}/${chunks.length}`)

        // Add delay between requests to avoid rate limiting (increased delay)
        if (i < chunks.length - 1) {
          await delay(1000) // 1 second delay between chunks
        }
      } catch (error) {
        console.error(`Failed to summarize chunk ${chunk.file}:${chunk.chunk}:`, error)

        // Add chunk with error message instead of failing completely
        summarizedChunks.push({
          ...chunk,
          summary: `[Summarization failed: ${error instanceof Error ? error.message : "Unknown error"}]`,
        })
      }
    }

    console.log(`Completed summarization: ${summarizedChunks.length} chunks processed`)
    return NextResponse.json({ summarizedChunks })
  } catch (error) {
    console.error("Error in summarize-chunks API:", error)
    return NextResponse.json(
      {
        error: "Failed to summarize chunks",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
