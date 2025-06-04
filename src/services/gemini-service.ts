import type { ChunkedFile } from "@/types/repository"

export class GeminiService {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ""
  }

  async summarizeChunk(chunk: ChunkedFile): Promise<string> {
    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": this.apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Summarize the following code snippet from file ${chunk.file}, chunk ${chunk.chunk}. Focus on what the code does, key functions, and important logic. Keep it concise (3-5 sentences max):\n\n${chunk.content}`,
                  },
                ],
              },
            ],
          }),
        },
      )

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`)
      }

      const data = await response.json()
      return data.candidates[0].content.parts[0].text
    } catch (error) {
      console.error(`Failed to summarize chunk ${chunk.file}:${chunk.chunk}:`, error)
      return `[Failed to summarize this chunk: ${error instanceof Error ? error.message : "Unknown error"}]`
    }
  }

  async generateReadmeFromSummaries(summaries: ChunkedFile[], owner: string, repo: string): Promise<string> {
    try {
      // Group summaries by file
      const fileGroups: Record<string, string[]> = {}
      summaries.forEach((chunk) => {
        if (!fileGroups[chunk.file]) {
          fileGroups[chunk.file] = []
        }
        if (chunk.summary) {
          fileGroups[chunk.file].push(chunk.summary)
        }
      })

      // Create a consolidated summary for each file
      const fileSummaries = Object.entries(fileGroups)
        .map(([file, summaries]) => {
          return `## ${file}\n\n${summaries.join("\n\n")}`
        })
        .join("\n\n")

      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": this.apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Generate a comprehensive README.md for a GitHub repository named ${repo} by ${owner}. 
              
              Use the following file summaries to understand the codebase:
              
              ${fileSummaries}
              
              The README should include:
              1. Title and description
              2. Overview of what the project does
              3. Key features
              4. Technologies used
              5. Project structure
              6. Installation instructions
              7. Usage examples
              8. Contributing guidelines
              9. License information
              
              Format the README in proper Markdown with headings, code blocks, and bullet points.`,
                  },
                ],
              },
            ],
          }),
        },
      )

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`)
      }

      const data = await response.json()
      return data.candidates[0].content.parts[0].text
    } catch (error) {
      console.error("Failed to generate README:", error)
      return `# ${owner}/${repo}\n\n## Error Generating README\n\nFailed to generate a complete README: ${error instanceof Error ? error.message : "Unknown error"}\n\n## Available Summaries\n\n${summaries.map((chunk) => `### ${chunk.file} (Chunk ${chunk.chunk})\n\n${chunk.summary || "No summary available"}`).join("\n\n")}`
    }
  }
}
