import type { GitHubFile } from "@/types/repository"

export class GitHubService {
  private accessToken?: string
  private delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  constructor(accessToken?: string) {
    this.accessToken = accessToken
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "GitHub-README-Generator",
    }

    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`
    }

    return headers
  }

  async fetchRepositoryInfo(owner: string, repo: string) {
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: this.getHeaders(),
      })
      if (response.ok) {
        return await response.json()
      }
    } catch (error) {
      console.error("Failed to fetch repository info:", error)
    }
    return null
  }

  async fetchRepositoryTree(owner: string, repo: string): Promise<GitHubFile[]> {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`, {
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      // Try master branch if main doesn't exist
      const masterResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`, {
        headers: this.getHeaders(),
      })
      if (!masterResponse.ok) {
        throw new Error(`Failed to fetch repository tree: ${response.statusText}`)
      }
      const data = await masterResponse.json()
      return data.tree.filter((item: any) => item.type === "blob")
    }

    const data = await response.json()
    return data.tree.filter((item: any) => item.type === "blob")
  }

  // Fallback: Use raw.githubusercontent.com for direct file access
  async fetchFileContentDirect(owner: string, repo: string, filePath: string, branch = "main"): Promise<string | null> {
    try {
      // For raw.githubusercontent.com, we don't need the token in most cases
      // But for private repos, we'll need to use the GitHub API instead
      if (this.accessToken) {
        // Try using the GitHub API with authentication for private repos
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`
        const response = await fetch(apiUrl, {
          headers: this.getHeaders(),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.encoding === "base64" && data.content) {
            return atob(data.content.replace(/\s/g, ""))
          }
        }
      }

      // Fallback to raw.githubusercontent.com for public repos
      const response = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`, {
        headers: {
          "User-Agent": "GitHub-README-Generator",
        },
      })

      if (!response.ok) {
        // Try master branch if main fails
        if (branch === "main") {
          return this.fetchFileContentDirect(owner, repo, filePath, "master")
        }
        return null
      }

      return await response.text()
    } catch (error) {
      console.warn(`Failed to fetch ${filePath} directly:`, error)
      return null
    }
  }

  // New method: Fetch files using direct raw access (most efficient)
  async fetchFileContentsDirectBatch(owner: string, repo: string, filePaths: string[]): Promise<Map<string, string>> {
    const contentMap = new Map<string, string>()
    const batchSize = 10 // Can be higher since we're using raw.githubusercontent.com
    const delayBetweenBatches = 500 // Shorter delay

    // First, try to determine the default branch
    let defaultBranch = "main"
    try {
      const repoInfo = await this.fetchRepositoryInfo(owner, repo)
      if (repoInfo?.default_branch) {
        defaultBranch = repoInfo.default_branch
      }
    } catch (error) {
      console.warn("Could not determine default branch, using main")
    }

    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize)

      const batchPromises = batch.map(async (filePath) => {
        const content = await this.fetchFileContentDirect(owner, repo, filePath, defaultBranch)
        return content ? { filePath, content } : null
      })

      const batchResults = await Promise.all(batchPromises)

      batchResults.forEach((result) => {
        if (result) {
          contentMap.set(result.filePath, result.content)
        }
      })

      // Shorter delay for raw.githubusercontent.com
      if (i + batchSize < filePaths.length) {
        await this.delay(delayBetweenBatches)
      }
    }

    return contentMap
  }

  async downloadFileContent(file: GitHubFile): Promise<string> {
    const response = await fetch(file.url, {
      headers: this.getHeaders(),
    })
    if (!response.ok) {
      throw new Error(`Failed to download ${file.path}`)
    }

    const data = await response.json()
    return atob(data.content.replace(/\s/g, ""))
  }
}
