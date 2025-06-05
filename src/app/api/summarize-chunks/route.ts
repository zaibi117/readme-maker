import { type NextRequest, NextResponse } from "next/server"
import type { ChunkedFile } from "@/types/repository"
import { geminiRateLimiter } from "@/lib/rate-limiter"

interface SummarizeRequest {
  chunks: ChunkedFile[]
  accessToken?: string // GitHub access token
}

// Helper function to add delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Helper function to retry API calls with rate limiting
async function retryApiCallWithRateLimit<T>(apiCall: () => Promise<T>, maxRetries = 3, baseDelay = 1000): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Check rate limit before making the call
      const rateLimitCheck = await geminiRateLimiter.checkLimit("gemini-api")

      if (!rateLimitCheck.allowed) {
        console.log(
          `Rate limit exceeded. Waiting until reset (${Math.ceil(geminiRateLimiter.getRemainingTime("gemini-api") / 1000)}s)`,
        )
        await geminiRateLimiter.waitForReset("gemini-api")
      }

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

// Helper function to check if error should cause chunk to be skipped
function shouldSkipChunk(error: Error): boolean {
  const errorMessage = error.message.toLowerCase()

  // Skip chunks for these types of errors
  const skipConditions = [
    "overloaded",
    "unavailable",
    "service unavailable",
    "timeout",
    "rate limit",
    "quota exceeded",
    "too many requests",
    "503",
    "429",
    "500",
    "502",
    "504",
    "internal server error",
    "bad gateway",
    "gateway timeout",
  ]

  return skipConditions.some((condition) => errorMessage.includes(condition))
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
    let skippedCount = 0

    // Process chunks sequentially to respect rate limiting
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      console.log(`Processing chunk ${i + 1}/${chunks.length}: ${chunk.file} (chunk ${chunk.chunk})`)

      // Check remaining requests and time
      const remaining = geminiRateLimiter.getRemainingRequests("gemini-api")
      const resetTime = geminiRateLimiter.getRemainingTime("gemini-api")

      console.log(`Rate limit status: ${remaining} requests remaining, reset in ${Math.ceil(resetTime / 1000)}s`)

      try {
        const summary = await retryApiCallWithRateLimit(async () => {
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

        // Successfully summarized - add to results
        summarizedChunks.push({
          ...chunk,
          summary,
        })

        console.log(`Successfully summarized chunk ${i + 1}/${chunks.length}`)

        // Add delay between requests (reduced since we have rate limiting)
        if (i < chunks.length - 1) {
          await delay(500) // Reduced from 1000ms since rate limiter handles the timing
        }
      } catch (error) {
        console.error(`Failed to summarize chunk ${chunk.file}:${chunk.chunk}:`, error)

        // Check if we should skip this chunk due to API errors
        if (shouldSkipChunk(error as Error)) {
          console.log(`Skipping chunk ${chunk.file}:${chunk.chunk} due to API error: ${(error as Error).message}`)
          skippedCount++
          // Don't add this chunk to the results at all - just skip it
          continue
        }

        // For other types of errors, add chunk with error message
        summarizedChunks.push({
          ...chunk,
          summary: `[Summarization failed: ${error instanceof Error ? error.message : "Unknown error"}]`,
        })
      }
    }

    const successfulCount = summarizedChunks.filter(
      (chunk) => chunk.summary && !chunk.summary.includes("[Summarization failed"),
    ).length

    console.log(
      `Completed summarization: ${successfulCount} chunks successfully processed, ${skippedCount} chunks skipped due to API errors`,
    )

    return NextResponse.json({
      summarizedChunks,
      stats: {
        total: chunks.length,
        successful: successfulCount,
        skipped: skippedCount,
        failed: summarizedChunks.length - successfulCount,
      },
      rateLimitInfo: {
        remaining: geminiRateLimiter.getRemainingRequests("gemini-api"),
        resetTime: geminiRateLimiter.getRemainingTime("gemini-api"),
      },
    })
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
