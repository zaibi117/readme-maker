"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Crown, AlertCircle } from "lucide-react"
import { usePremium } from "@/hooks/use-premium"

interface UsageLimitAlertProps {
  remaining: number
  total: number
  resetAt: Date | null
  onUpgradeSuccess?: () => void
}

export function UsageLimitAlert({ remaining, total, resetAt, onUpgradeSuccess }: UsageLimitAlertProps) {
  const { openUpgradeModal, upgradeModal } = usePremium({ onUpgradeSuccess })

  if (remaining > 0) {
    return (
      <>
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Usage Limit</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              You have <strong>{remaining}</strong> of <strong>{total}</strong> free README generations remaining today.
            </span>
            <Button variant="outline" size="sm" className="ml-2 gap-1" onClick={() => openUpgradeModal(resetAt)}>
              <Crown className="h-4 w-4 text-yellow-500" />
              <span>Upgrade</span>
            </Button>
          </AlertDescription>
        </Alert>
        {upgradeModal}
      </>
    )
  }

  return (
    <>
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Daily Limit Reached</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>
            You've used all {total} free README generations for today.
            {resetAt && (
              <>
                {" "}
                Limit resets at {resetAt.toLocaleTimeString()} on {resetAt.toLocaleDateString()}.
              </>
            )}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="ml-2 gap-1 border-white hover:bg-white/20 hover:text-white"
            onClick={() => openUpgradeModal(resetAt)}
          >
            <Crown className="h-4 w-4 text-yellow-500" />
            <span>Upgrade Now</span>
          </Button>
        </AlertDescription>
      </Alert>
      {upgradeModal}
    </>
  )
}
