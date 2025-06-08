"use client"

import { useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { PremiumUpgradeModal } from "@/components/premium-upgrade-modal"

export interface UsePremiumOptions {
    onUpgradeSuccess?: () => void
}

export function usePremium(options?: UsePremiumOptions) {
    const { data: session, update } = useSession()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [resetTime, setResetTime] = useState<Date | null>(null)

    const openUpgradeModal = useCallback((resetAt?: Date | null) => {
        if (resetAt) {
            setResetTime(resetAt)
        }
        setIsModalOpen(true)
    }, [])

    const closeUpgradeModal = useCallback(() => {
        setIsModalOpen(false)
    }, [])

    const handleUpgrade = useCallback(async () => {
        try {
            const response = await fetch("/api/premium/upgrade", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || "Failed to upgrade to premium")
            }

            // Update the session to reflect premium status
            await update()

            // Call success callback if provided
            if (options?.onUpgradeSuccess) {
                options.onUpgradeSuccess()
            }
        } catch (error) {
            console.error("Error upgrading to premium:", error)
            throw error
        }
    }, [update, options])

    return {
        isPremium: session?.user?.isPremium || false,
        openUpgradeModal,
        closeUpgradeModal,
        upgradeModal: (
            <PremiumUpgradeModal
                isOpen={isModalOpen}
                onClose={closeUpgradeModal}
                onUpgrade={handleUpgrade}
                resetTime={resetTime}
            />
        ),
    }
}
