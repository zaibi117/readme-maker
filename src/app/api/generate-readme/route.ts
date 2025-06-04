import { type NextRequest, NextResponse } from "next/server"
import type { ChunkedFile } from "@/types/repository"

interface GenerateReadmeRequest {
  summaries: ChunkedFile[]
  owner: string
  repo: string
  accessToken?: string // GitHub access token
}

// Helper function to add delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Helper function to retry API calls
async function retryApiCall<T>(apiCall: () => Promise<T>, maxRetries = 3, baseDelay = 2000): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
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
  try {
    const body: GenerateReadmeRequest = await req.json()
    const { summaries, owner, repo, accessToken } = body

    if (!summaries || !Array.isArray(summaries) || !owner || !repo) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 })
    }

    console.log(`Generating README for ${owner}/${repo} with ${summaries.length} summaries`)

    // Group summaries by file
    const fileGroups: Record<string, string[]> = {}
    summaries.forEach((chunk) => {
      if (!fileGroups[chunk.file]) {
        fileGroups[chunk.file] = []
      }
      if (chunk.summary && !chunk.summary.includes("[Summarization failed")) {
        fileGroups[chunk.file].push(chunk.summary)
      }
    })

    // Create a consolidated summary for each file
    const fileSummaries = Object.entries(fileGroups)
      .filter(([_, summaries]) => summaries.length > 0) // Only include files with valid summaries
      .map(([file, summaries]) => {
        return `**${file}**:\n${summaries.join(" ")}`
      })
      .join("\n\n")

    // Fetch additional repository information if access token is provided
    let repoInfo: any = {}
    if (accessToken) {
      try {
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
        }
      } catch (error) {
        console.warn("Failed to fetch additional repository info:", error)
      }
    }

    // Create repository context
    const repoContext = repoInfo.description ? `Repository Description: ${repoInfo.description}\n` : ""

    const repoLanguage = repoInfo.language ? `Primary Language: ${repoInfo.language}\n` : ""

    const readme = await retryApiCall(async () => {
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

Format requirements:
- Use proper Markdown syntax
- Include code blocks with syntax highlighting
- Use badges if appropriate
- Make it professional and easy to read
- Keep it concise but informative

Generate only the README content, no additional commentary.`,
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

      return data.candidates[0].content.parts[0].text
    })

    console.log("README generated successfully")
    return NextResponse.json({ readme })
  } catch (error) {
    console.error("Error in generate-readme API:", error)

    // Return fallback README on error
    const { summaries, owner, repo } = await req.json()
    const fallbackReadme = `# ${owner}/${repo}

## Overview

This repository contains code that has been automatically analyzed. Due to processing limitations, a complete README could not be generated.

## Error Details

**Error**: ${error instanceof Error ? error.message : "Unknown error occurred during README generation"}

## Code Analysis Summary

${summaries
  .filter((chunk: ChunkedFile) => chunk.summary && !chunk.summary.includes("[Summarization failed"))
  .map(
    (chunk: ChunkedFile) => `### ${chunk.file} (Chunk ${chunk.chunk})

${chunk.summary}`,
  )
  .join("\n\n")}

## Getting Started

Please refer to the code files directly for implementation details and usage instructions.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

Please check the repository for license information.`

    return NextResponse.json({ readme: fallbackReadme })
  }
}
