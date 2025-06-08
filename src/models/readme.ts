import mongoose, { Schema, type Document } from "mongoose"

export interface IReadme extends Document {
  repoId: string
  owner: string
  repo: string
  readmeContent: string
  generatedAt: Date
  isOriginal: boolean
  source: "github" | "generated"
  userId: mongoose.Types.ObjectId
  generationType: "free" | "premium"
  processingTime?: number
  chunkCount?: number
}

const ReadmeSchema: Schema = new Schema({
  repoId: { type: String, required: true, index: true },
  owner: { type: String, required: true },
  repo: { type: String, required: true },
  readmeContent: { type: String, required: true },
  generatedAt: { type: Date, default: Date.now },
  isOriginal: { type: Boolean, default: false },
  source: { type: String, enum: ["github", "generated"], default: "generated" },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  generationType: { type: String, enum: ["free", "premium"], default: "free" },
  processingTime: { type: Number }, // in milliseconds
  chunkCount: { type: Number },
})

// Create indexes for faster lookups
ReadmeSchema.index({ owner: 1, repo: 1 })
ReadmeSchema.index({ userId: 1, generatedAt: -1 })
ReadmeSchema.index({ generatedAt: -1 })

// Check if the model already exists to prevent OverwriteModelError during hot reloads
export default mongoose.models.Readme || mongoose.model<IReadme>("Readme", ReadmeSchema)
