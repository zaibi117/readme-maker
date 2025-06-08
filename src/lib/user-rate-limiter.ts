import connectToDatabase from "@/lib/mongodb"
import User from "@/models/user"
import Readme from "@/models/readme"
import mongoose from "mongoose"
import { UserCheck } from "lucide-react"

export interface RateLimitResult {
    allowed: boolean
    remaining: number
    total: number
    resetAt: Date | null
    isPremium: boolean
}

export class UserRateLimiter {
    private static readonly FREE_DAILY_LIMIT = 1

    /**
     * Check if a user has reached their README generation limit
     * @param userId The user's ID
     * @returns Rate limit information
     */
    static async checkReadmeGenerationLimit(userId: string): Promise<RateLimitResult> {
        try {
            await connectToDatabase()

            // @ts-ignore
            const user = await User.findOne({ githubId: userId })

            if (!user) {
                throw new Error("User not found")
            }

            // Premium users have unlimited generations
            if (user.isPremium) {
                return {
                    allowed: true,
                    remaining: -1, // -1 indicates unlimited
                    total: -1,
                    resetAt: null,
                    isPremium: true,
                }
            }

            // Get today's date in UTC
            const today = new Date()
            today.setUTCHours(0, 0, 0, 0)

            const tomorrow = new Date(today)
            tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)

            // Count today's README generations
            const todayGenerationsCount = await Readme.countDocuments({
                userId: user._id,
                generatedAt: {
                    $gte: today,
                    $lt: tomorrow,
                },
            })

            const remaining = Math.max(0, this.FREE_DAILY_LIMIT - todayGenerationsCount)

            return {
                allowed: remaining > 0,
                remaining,
                total: this.FREE_DAILY_LIMIT,
                resetAt: tomorrow,
                isPremium: false,
            }
        } catch (error) {
            console.error("Error checking README generation limit:", error)
            throw error
        }
    }

    /**
     * Record a README generation for a user
     * @param userId The user's ID
     * @param readmeData README generation data
     * @returns Updated rate limit information
     */
    static async recordReadmeGeneration(
        userId: string,
        readmeData: {
            owner: string
            repo: string
            readmeContent: string
            repoId: string
            source?: "github" | "generated"
            processingTime?: number
            chunkCount?: number
        },
    ): Promise<{ rateLimitInfo: RateLimitResult; readmeId: string }> {
        try {
            await connectToDatabase()

            //@ts-ignore
            const user = await User.findOne({ githubId: userId })

            if (!user) {
                throw new Error("User not found")
            }

            // Check if user is allowed to generate
            const rateLimitCheck = await this.checkReadmeGenerationLimit(userId)

            if (!rateLimitCheck.allowed && !rateLimitCheck.isPremium) {
                return {
                    rateLimitInfo: rateLimitCheck,
                    readmeId: "",
                }
            }

            // Create the README document
            // @ts-ignore
            const readme = await Readme.create({
                ...readmeData,
                userId: user._id,
                generationType: user.isPremium ? "premium" : "free",
                generatedAt: new Date(),
            })

            // Add the README reference to the user's readmeGenerations array
            user.readmeGenerations.push(readme._id)
            await user.save()

            // Get updated rate limit info
            const updatedRateLimitInfo = await this.checkReadmeGenerationLimit(userId)

            return {
                rateLimitInfo: updatedRateLimitInfo,
                readmeId: readme._id.toString(),
            }
        } catch (error) {
            console.error("Error recording README generation:", error)
            throw error
        }
    }

    /**
     * Get user usage statistics
     * @param userId The user's ID
     * @returns Usage statistics
     */
    static async getUserUsageStats(userId: string) {
        try {
            await connectToDatabase()

            //@ts-ignore
            const user = await User.findOne({ githubId: userId })

            if (!user) {
                throw new Error("User not found")
            }

            // Get total generations count
            const totalGenerations = await Readme.countDocuments({ userId: user._id })

            // Get this month's generations
            const thisMonth = new Date()
            thisMonth.setUTCDate(1)
            thisMonth.setUTCHours(0, 0, 0, 0)

            const nextMonth = new Date(thisMonth)
            nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1)

            const thisMonthGenerations = await Readme.countDocuments({
                userId: user._id,
                generatedAt: {
                    $gte: thisMonth,
                    $lt: nextMonth,
                },
            })

            // Get today's generations
            const today = new Date()
            today.setUTCHours(0, 0, 0, 0)

            const tomorrow = new Date(today)
            tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)

            const todayGenerations = await Readme.countDocuments({
                userId: user._id,
                generatedAt: {
                    $gte: today,
                    $lt: tomorrow,
                },
            })

            // Get last generation
            // @ts-ignore
            const lastGeneration = await Readme.findOne({ userId: user._id }, {}, { sort: { generatedAt: -1 } })

            // Get generation type breakdown
            const generationsByType = await Readme.aggregate([
                { $match: { userId: user._id } },
                {
                    $group: {
                        _id: "$generationType",
                        count: { $sum: 1 },
                    },
                },
            ])

            const typeBreakdown = generationsByType.reduce(
                (acc, item) => {
                    acc[item._id] = item.count
                    return acc
                },
                { free: 0, premium: 0 },
            )

            return {
                totalGenerations,
                thisMonthGenerations,
                todayGenerations,
                isPremium: user.isPremium,
                memberSince: user.createdAt,
                lastGeneration: lastGeneration?.generatedAt || null,
                generationsByType: typeBreakdown,
                averageProcessingTime: await this.getAverageProcessingTime(userId),
            }
        } catch (error) {
            console.error("Error getting user usage stats:", error)
            throw error
        }
    }

    /**
     * Get user's README generation history with pagination
     * @param userId The user's ID
     * @param page Page number (1-based)
     * @param limit Items per page
     * @returns Paginated README history
     */
    static async getUserReadmeHistory(userId: string, page = 1, limit = 10) {
        try {
            await connectToDatabase()

            const skip = (page - 1) * limit

            //@ts-ignore
            const user = await User.findOne({ githubId: userId })

            //@ts-ignore
            const readmes = await Readme.find({ userId: user._id })
                .sort({ generatedAt: -1 })
                .skip(skip)
                .limit(limit)
                .select("owner repo generatedAt generationType processingTime chunkCount source")

            const totalCount = await Readme.countDocuments({ userId })
            const totalPages = Math.ceil(totalCount / limit)

            return {
                readmes,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalCount,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1,
                },
            }
        } catch (error) {
            console.error("Error getting user README history:", error)
            throw error
        }
    }

    /**
     * Get average processing time for user's generations
     * @param userId The user's ID
     * @returns Average processing time in milliseconds
     */
    private static async getAverageProcessingTime(userId: string): Promise<number | null> {
        try {
            const result = await Readme.aggregate([
                {
                    $match: {
                        userId: new mongoose.Types.ObjectId(userId),
                        processingTime: { $exists: true, $ne: null },
                    },
                },
                {
                    $group: {
                        _id: null,
                        averageTime: { $avg: "$processingTime" },
                    },
                },
            ])

            return result.length > 0 ? Math.round(result[0].averageTime) : null
        } catch (error) {
            console.error("Error calculating average processing time:", error)
            return null
        }
    }

    /**
     * Clean up old README generations (optional maintenance function)
     * @param daysToKeep Number of days to keep (default: 90)
     */
    static async cleanupOldGenerations(daysToKeep = 90) {
        try {
            await connectToDatabase()

            const cutoffDate = new Date()
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

            // Find old READMEs
            //@ts-ignore
            const oldReadmes = await Readme.find({
                generatedAt: { $lt: cutoffDate },
            }).select("_id userId")

            if (oldReadmes.length === 0) {
                console.log("No old README generations to clean up")
                return
            }

            // Remove references from users
            const userUpdates = oldReadmes.reduce(
                (acc, readme) => {
                    if (!acc[readme.userId.toString()]) {
                        acc[readme.userId.toString()] = []
                    }
                    acc[readme.userId.toString()].push(readme._id)
                    return acc
                },
                {} as Record<string, any[]>,
            )

            for (const [userId, readmeIds] of Object.entries(userUpdates)) {
                //@ts-ignore
                await User.findByIdAndUpdate(userId, {
                    $pull: { readmeGenerations: { $in: readmeIds } },
                })
            }

            // Delete old README documents
            //@ts-ignore
            const deleteResult = await Readme.deleteMany({
                generatedAt: { $lt: cutoffDate },
            })

            console.log(`Cleaned up ${deleteResult.deletedCount} old README generations`)
        } catch (error) {
            console.error("Error cleaning up old generations:", error)
            throw error
        }
    }
}
