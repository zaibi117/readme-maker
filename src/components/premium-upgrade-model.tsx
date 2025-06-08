"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, Crown, X } from "lucide-react"

interface PremiumUpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  onUpgrade: () => Promise<void>
  resetTime?: Date | null
}

export function PremiumUpgradeModal({ isOpen, onClose, onUpgrade, resetTime }: PremiumUpgradeModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleUpgrade = async () => {
    setIsLoading(true)
    try {
      await onUpgrade()
      setIsSuccess(true)
      setTimeout(() => {
        onClose()
        setIsSuccess(false)
      }, 2000)
    } catch (error) {
      console.error("Error upgrading to premium:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatResetTime = () => {
    if (!resetTime) return "tomorrow"

    const now = new Date()
    const hours = Math.ceil((resetTime.getTime() - now.getTime()) / (1000 * 60 * 60))

    if (hours < 1) return "less than an hour"
    if (hours === 1) return "1 hour"
    if (hours < 24) return `${hours} hours`
    return "tomorrow"
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Upgrade to Premium
          </DialogTitle>
          <DialogDescription>Unlock unlimited README generations and premium features</DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-foreground">Upgrade Successful!</h3>
            <p className="mt-2 text-center text-muted-foreground">You now have access to all premium features</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-border p-4">
                <h3 className="font-medium text-foreground">Free</h3>
                <p className="text-sm text-muted-foreground mt-1">Current plan</p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span>1 README per day</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span>Basic analysis</span>
                  </li>
                  <li className="flex items-center">
                    <X className="h-4 w-4 text-red-500 mr-2" />
                    <span className="text-muted-foreground">Custom templates</span>
                  </li>
                  <li className="flex items-center">
                    <X className="h-4 w-4 text-red-500 mr-2" />
                    <span className="text-muted-foreground">Priority processing</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border border-primary bg-primary/5 p-4 relative">
                <Badge className="absolute -top-2 -right-2 bg-yellow-500 hover:bg-yellow-600">Recommended</Badge>
                <h3 className="font-medium text-foreground">Premium</h3>
                <p className="text-sm text-muted-foreground mt-1">$9.99/month</p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span>Unlimited READMEs</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span>Advanced analysis</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span>Custom templates</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span>Priority processing</span>
                  </li>
                </ul>
              </div>
            </div>

            {resetTime && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-2">
                <Clock className="h-4 w-4" />
                <span>Free limit resets in {formatResetTime()}</span>
              </div>
            )}
          </>
        )}

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Maybe later
          </Button>
          <Button onClick={handleUpgrade} disabled={isLoading || isSuccess}>
            {isLoading ? "Processing..." : "Upgrade Now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
