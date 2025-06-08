import { type NextRequest, NextResponse } from "next/server"
import type { ChunkedFile } from "@/types/repository"
import { geminiRateLimiter } from "@/lib/rate-limiter"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { UserRateLimiter } from "@/lib/user-rate-limiter"
import connectToDatabase from "@/lib/mongodb"

interface GenerateReadmeRequest {
  summaries: ChunkedFile[]
  owner: string
  repo: string
  accessToken?: string
}

// Helper function to add delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Helper function to retry API calls with rate limiting
async function retryApiCallWithRateLimit<T>(apiCall: () => Promise<T>, maxRetries = 3, baseDelay = 2000): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Check rate limit before making the call
      const rateLimitCheck = await geminiRateLimiter.checkLimit("gemini-api")

      if (!rateLimitCheck.allowed) {
        console.log(
          `Rate limit exceeded for README generation. Waiting until reset (${Math.ceil(geminiRateLimiter.getRemainingTime("gemini-api") / 1000)}s)`,
        )
        await geminiRateLimiter.waitForReset("gemini-api")
      }

      return await apiCall()
    } catch (error) {
      lastError = error as Error
      console.warn(`README generation attempt ${attempt} failed:`, error)

      if (attempt < maxRetries) {
        // Exponential backoff: 2s, 4s, 8s
        const delayTime = baseDelay * Math.pow(2, attempt - 1)
        console.log(`Retrying README generation in ${delayTime}ms...`)
        await delay(delayTime)
      }
    }
  }

  throw lastError!
}

export async function POST(req: NextRequest) {
  console.log("README generation API called")
  const startTime = Date.now()

  try {
    // Check user authentication
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Connect to database
    await connectToDatabase()

    // Check user rate limit
    const userId = session.user.id
    const rateLimitCheck = await UserRateLimiter.checkReadmeGenerationLimit(userId)

    if (!rateLimitCheck.allowed && !rateLimitCheck.isPremium) {
      const resetTime = rateLimitCheck.resetAt ? new Date(rateLimitCheck.resetAt).toLocaleString() : "tomorrow"

      return NextResponse.json(
        {
          error: "Daily README generation limit reached",
          details: {
            message: "You've reached your daily limit for free README generations",
            limit: rateLimitCheck.total,
            resetAt: resetTime,
            isPremium: false,
            upgradeRequired: true,
          },
        },
        { status: 429 },
      )
    }

    const body: GenerateReadmeRequest = await req.json()
    const { summaries, owner, repo, accessToken } = body

    console.log(`Generating README for ${owner}/${repo} with ${summaries?.length || 0} summaries`)

    if (!summaries || !Array.isArray(summaries) || !owner || !repo) {
      console.error("Invalid request data:", { summaries: !!summaries, owner, repo })
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error("Gemini API key not configured")
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 })
    }

    // Check rate limit status before proceeding
    const remaining = geminiRateLimiter.getRemainingRequests("gemini-api")
    const resetTime = geminiRateLimiter.getRemainingTime("gemini-api")
    console.log(
      `Rate limit status for README generation: ${remaining} requests remaining, reset in ${Math.ceil(resetTime / 1000)}s`,
    )

    // Group summaries by file
    const fileGroups: Record<string, string[]> = {}
    summaries.forEach((chunk) => {
      if (!fileGroups[chunk.file]) {
        fileGroups[chunk.file] = []
      }
      if (
        chunk.summary &&
        !chunk.summary.includes("[Summarization failed") &&
        !chunk.summary.includes("[Failed to summarize")
      ) {
        fileGroups[chunk.file].push(chunk.summary)
      }
    })

    console.log(`Grouped summaries into ${Object.keys(fileGroups).length} files`)

    // Create a consolidated summary for each file
    const fileSummaries = Object.entries(fileGroups)
      .filter(([_, summaries]) => summaries.length > 0) // Only include files with valid summaries
      .map(([file, summaries]) => {
        return `**${file}**:\n${summaries.join(" ")}`
      })
      .join("\n\n")

    let readme: string

    if (!fileSummaries.trim()) {
      console.warn("No valid summaries found, creating basic README")
      readme = `# ${owner}/${repo}

## Overview

This repository contains a project that has been automatically analyzed.

## Getting Started

To get started with this project:

1. Clone the repository
2. Install dependencies
3. Follow the setup instructions in the code files

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

Please check the repository for license information.`
    } else {
      // Fetch additional repository information if access token is provided
      let repoInfo: any = {}
      if (accessToken) {
        try {
          console.log("Fetching repository info with access token")
          const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: {
              Accept: "application/vnd.github.v3+json",
              Authorization: `Bearer ${accessToken}`,
              "User-Agent": "GitHub-README-Generator",
            },
          })

          if (repoResponse.ok) {
            repoInfo = await repoResponse.json()
            console.log("Fetched repository info successfully")
          } else {
            console.warn("Failed to fetch repository info:", repoResponse.status)
          }
        } catch (error) {
          console.warn("Failed to fetch additional repository info:", error)
        }
      }

      // Create repository context
      const repoContext = repoInfo.description ? `Repository Description: ${repoInfo.description}\n` : ""
      const repoLanguage = repoInfo.language ? `Primary Language: ${repoInfo.language}\n` : ""

      console.log("Calling Gemini API for README generation")

      readme = await retryApiCallWithRateLimit(async () => {
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
                      text: `Generate a comprehensive and professional README.md for the GitHub repository "${owner}/${repo}".

${repoContext}${repoLanguage}

Based on the following code analysis:

${fileSummaries}

Create a README that includes:

1. **Project Title and Description** - Clear, engaging description
2. **Features** - Key functionality and capabilities
3. **Technologies Used** - Programming languages, frameworks, libraries
4. **Installation** - Step-by-step setup instructions
5. **Usage** - Code examples and basic usage
6. **Project Structure** - Brief overview of main files/directories
7. **Contributing** - Guidelines for contributors
8. **License** - Standard license section

IMPORTANT: 
- Generate ONLY the README content in markdown format
- Do NOT wrap the output in markdown code blocks (no \`\`\`markdown)
- Do NOT include any prefixes or suffixes
- Start directly with the # title
- Use proper Markdown syntax throughout
- Include code blocks with syntax highlighting where appropriate
- Make it professional and easy to read

Generate only the raw markdown content, nothing else.`,
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.3,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
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

        let cleanedReadme = data.candidates[0].content.parts[0].text

        // Remove markdown code block wrappers if present
        cleanedReadme = cleanedReadme.replace(/^```markdown\s*\n?/i, "")
        cleanedReadme = cleanedReadme.replace(/\n?```\s*$/i, "")
        cleanedReadme = cleanedReadme.replace(/^```\s*\n?/i, "")
        cleanedReadme = cleanedReadme.replace(/\n?```\s*$/i, "")

        // Trim any extra whitespace
        cleanedReadme = cleanedReadme.trim()

        return cleanedReadme
      })
    }

    // Calculate processing time
    const processingTime = Date.now() - startTime

    // Record the README generation with enhanced data
    const { rateLimitInfo, readmeId } = await UserRateLimiter.recordReadmeGeneration(userId, {
      owner,
      repo,
      readmeContent: readme,
      repoId: `${owner}/${repo}`,
      source: "generated",
      processingTime,
      chunkCount: summaries.length,
    })

    console.log("README generated successfully")
    return NextResponse.json({
      readme,
      readmeId,
      rateLimitInfo: {
        remaining: geminiRateLimiter.getRemainingRequests("gemini-api"),
        resetTime: geminiRateLimiter.getRemainingTime("gemini-api"),
      },
      userRateLimit: rateLimitInfo,
      processingTime,
    })
  } catch (error) {
    console.error("Error in generate-readme API:", error)

    // Create a fallback README with the available summaries
    try {
      const body = await req.json()
      const { summaries, owner, repo } = body

      const fallbackReadme = `# ${owner}/${repo}

## Overview

This repository contains code that has been automatically analyzed. Due to processing limitations, a complete README could not be generated automatically.

## Error Details

**Error**: ${error instanceof Error ? error.message : "Unknown error occurred during README generation"}

## Code Analysis Summary

${summaries
          ?.filter(
            (chunk: ChunkedFile) =>
              chunk.summary &&
              !chunk.summary.includes("[Summarization failed") &&
              !chunk.summary.includes("[Failed to summarize"),
          )
          ?.map(
            (chunk: ChunkedFile) => `### ${chunk.file} (Chunk ${chunk.chunk})

${chunk.summary}`,
          )
          ?.join("\n\n") || "No valid summaries available"
        }

## Getting Started

Please refer to the code files directly for implementation details and usage instructions.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

Please check the repository for license information.`

      // Try to record the README generation even for fallback
      const session = await getServerSession(authOptions)
      if (session?.user?.id) {
        const processingTime = Date.now() - startTime
        await UserRateLimiter.recordReadmeGeneration(session.user.id, {
          owner,
          repo,
          readmeContent: fallbackReadme,
          repoId: `${owner}/${repo}`,
          source: "generated",
          processingTime,
          chunkCount: summaries?.length || 0,
        })
      }

      return NextResponse.json({ readme: fallbackReadme })
    } catch (fallbackError) {
      console.error("Failed to create fallback README:", fallbackError)
      return NextResponse.json(
        {
          error: "Failed to generate README",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      )
    }
  }
}

// Add OPTIONS handler for CORS if needed
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
