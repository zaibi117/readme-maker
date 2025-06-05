import mongoose, { Schema, type Document } from "mongoose"

export interface IReadme extends Document {
  repoId: string
  owner: string
  repo: string
  readmeContent: string
  generatedAt: Date
  isOriginal: boolean
  source: "github" | "generated"
}

const ReadmeSchema: Schema = new Schema({
  repoId: { type: String, required: true, index: true },
  owner: { type: String, required: true },
  repo: { type: String, required: true },
  readmeContent: { type: String, required: true },
  generatedAt: { type: Date, default: Date.now },
  isOriginal: { type: Boolean, default: false },
  source: { type: String, enum: ["github", "generated"], default: "generated" },
})

// Create a compound index for faster lookups
ReadmeSchema.index({ owner: 1, repo: 1 })

// Check if the model already exists to prevent OverwriteModelError during hot reloads
export default mongoose.models.Readme || mongoose.model<IReadme>("Readme", ReadmeSchema)
