"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"

interface UserLimitInfo {
  remaining: number
  total: number
  resetAt: Date | null
  isPremium: boolean
}

export function useUserLimits() {
  const { data: session } = useSession()
  const [limitInfo, setLimitInfo] = useState<UserLimitInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLimitInfo = async () => {
    if (!session?.user?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/user")

      if (!response.ok) {
        throw new Error("Failed to fetch user limit information")
      }

      const data = await response.json()

      if (data.usageLimit) {
        setLimitInfo({
          ...data.usageLimit,
          resetAt: data.usageLimit.resetAt ? new Date(data.usageLimit.resetAt) : null,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
      console.error("Error fetching user limits:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user?.id) {
      fetchLimitInfo()
    }
  }, [session?.user?.id])

  return {
    limitInfo,
    isLoading,
    error,
    refresh: fetchLimitInfo,
  }
}
