import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import type { ChunkedFile } from "@/types/repository"
import { geminiRateLimiter } from "@/lib/rate-limiter"
import { UserRateLimiter } from "@/lib/user-rate-limiter"

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
      return NextResponse.json(
        {
          error: "Invalid request",
          details: "Chunks data is required and must be an array",
          code: "INVALID_CHUNKS",
        },
        { status: 400 },
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "Service configuration error",
          details: "AI service is not properly configured. Please contact support.",
          code: "MISSING_API_KEY",
        },
        { status: 500 },
      )
    }

    // Check user authentication and premium status
    const session = await getServerSession(authOptions)
    let isPremiumUser = false
    let userLimitInfo = null

    if (session?.user?.id) {
      try {
        userLimitInfo = await UserRateLimiter.checkReadmeGenerationLimit(session.user.id)
        isPremiumUser = userLimitInfo.isPremium

        // For free users, check if they have remaining generations
        if (!isPremiumUser && !userLimitInfo.allowed) {
          return NextResponse.json(
            {
              error: "Daily limit exceeded",
              details: `You have reached your daily limit of ${userLimitInfo.total} README generation${userLimitInfo.total > 1 ? "s" : ""}. Upgrade to Premium for unlimited generations.`,
              code: "RATE_LIMIT_EXCEEDED",
              rateLimitInfo: userLimitInfo,
            },
            { status: 429 },
          )
        }
      } catch (error) {
        console.error("Error checking user limits:", error)
        // Continue without premium features if user check fails
      }
    }

    console.log(`Processing ${chunks.length} chunks for summarization (Premium: ${isPremiumUser})`)
    const summarizedChunks: ChunkedFile[] = []
    let skippedCount = 0
    let errorCount = 0

    // Premium users get faster processing with reduced delays
    const processingDelay = isPremiumUser ? 300 : 500
    const maxRetries = isPremiumUser ? 5 : 3

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
                  maxOutputTokens: isPremiumUser ? 300 : 200, // Premium users get more detailed summaries
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

            // Provide more specific error messages
            let errorMessage = `AI service error (${response.status})`
            if (response.status === 429) {
              errorMessage = "AI service rate limit exceeded. Please try again later."
            } else if (response.status >= 500) {
              errorMessage = "AI service is temporarily unavailable. Please try again."
            } else if (response.status === 403) {
              errorMessage = "AI service access denied. Please check configuration."
            }

            throw new Error(errorMessage)
          }

          const data = await response.json()

          if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            console.error("Invalid response structure:", data)
            throw new Error("AI service returned invalid response format")
          }

          return data.candidates[0].content.parts[0].text
        }, maxRetries)

        // Successfully summarized - add to results
        summarizedChunks.push({
          ...chunk,
          summary,
        })

        console.log(`Successfully summarized chunk ${i + 1}/${chunks.length}`)

        // Add delay between requests (premium users get faster processing)
        if (i < chunks.length - 1) {
          await delay(processingDelay)
        }
      } catch (error) {
        console.error(`Failed to summarize chunk ${chunk.file}:${chunk.chunk}:`, error)
        errorCount++

        // Check if we should skip this chunk due to API errors
        if (shouldSkipChunk(error as Error)) {
          console.log(`Skipping chunk ${chunk.file}:${chunk.chunk} due to API error: ${(error as Error).message}`)
          skippedCount++
          // Don't add this chunk to the results at all - just skip it
          continue
        }

        // For other types of errors, add chunk with error message
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
        summarizedChunks.push({
          ...chunk,
          summary: `[Summarization failed: ${errorMessage}]`,
        })
      }
    }

    const successfulCount = summarizedChunks.filter(
      (chunk) => chunk.summary && !chunk.summary.includes("[Summarization failed"),
    ).length

    console.log(
      `Completed summarization: ${successfulCount} chunks successfully processed, ${skippedCount} chunks skipped, ${errorCount} errors`,
    )

    // Prepare response with detailed information
    const response = {
      summarizedChunks,
      stats: {
        total: chunks.length,
        successful: successfulCount,
        skipped: skippedCount,
        failed: errorCount,
        isPremium: isPremiumUser,
      },
      rateLimitInfo: {
        remaining: geminiRateLimiter.getRemainingRequests("gemini-api"),
        resetTime: geminiRateLimiter.getRemainingTime("gemini-api"),
      },
      userInfo: userLimitInfo
        ? {
          isPremium: userLimitInfo.isPremium,
          remaining: userLimitInfo.remaining,
          total: userLimitInfo.total,
          resetAt: userLimitInfo.resetAt,
        }
        : null,
    }

    // If too many chunks failed, return an error
    if (successfulCount === 0 && chunks.length > 0) {
      return NextResponse.json(
        {
          error: "Processing failed",
          details: "Unable to process any code chunks. This may be due to AI service issues or invalid content.",
          code: "PROCESSING_FAILED",
          ...response,
        },
        { status: 500 },
      )
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error in summarize-chunks API:", error)

    // Provide specific error messages based on error type
    let errorMessage = "Failed to process code chunks"
    let errorCode = "UNKNOWN_ERROR"
    let statusCode = 500

    if (error instanceof Error) {
      if (error.message.includes("User not found")) {
        errorMessage = "User authentication error"
        errorCode = "USER_NOT_FOUND"
        statusCode = 401
      } else if (error.message.includes("rate limit")) {
        errorMessage = "Service rate limit exceeded"
        errorCode = "RATE_LIMIT_EXCEEDED"
        statusCode = 429
      } else if (error.message.includes("network") || error.message.includes("fetch")) {
        errorMessage = "Network connection error"
        errorCode = "NETWORK_ERROR"
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.message : "An unexpected error occurred",
        code: errorCode,
        timestamp: new Date().toISOString(),
      },
      { status: statusCode },
    )
  }
}
