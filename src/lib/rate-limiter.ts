interface RateLimitEntry {
  count: number
  resetTime: number
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map()
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(maxRequests = 15, windowMs = 60000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  async checkLimit(key: string): Promise<{ allowed: boolean; resetTime?: number; remaining?: number }> {
    const now = Date.now()
    const entry = this.limits.get(key)

    // If no entry exists or the window has expired, create a new one
    if (!entry || now >= entry.resetTime) {
      this.limits.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      })
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs,
      }
    }

    // If we're within the limit, increment and allow
    if (entry.count < this.maxRequests) {
      entry.count++
      return {
        allowed: true,
        remaining: this.maxRequests - entry.count,
        resetTime: entry.resetTime,
      }
    }

    // Rate limit exceeded
    return {
      allowed: false,
      resetTime: entry.resetTime,
      remaining: 0,
    }
  }

  async waitForReset(key: string): Promise<void> {
    const entry = this.limits.get(key)
    if (!entry) return

    const now = Date.now()
    const waitTime = entry.resetTime - now

    if (waitTime > 0) {
      console.log(`Rate limit exceeded. Waiting ${Math.ceil(waitTime / 1000)} seconds...`)
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }
  }

  getRemainingTime(key: string): number {
    const entry = this.limits.get(key)
    if (!entry) return 0

    const now = Date.now()
    return Math.max(0, entry.resetTime - now)
  }

  getRemainingRequests(key: string): number {
    const entry = this.limits.get(key)
    if (!entry) return this.maxRequests

    const now = Date.now()
    if (now >= entry.resetTime) return this.maxRequests

    return Math.max(0, this.maxRequests - entry.count)
  }
}

// Create a singleton instance for Gemini API rate limiting
export const geminiRateLimiter = new RateLimiter(15, 60000) // 15 requests per minute

export default RateLimiter
