import mongoose, { Schema, type Document } from "mongoose"

export interface ISummaryCache extends Document {
  repoId: string
  owner: string
  repo: string
  summaries: Array<{
    file: string
    chunk: number
    content: string
    summary: string
  }>
  createdAt: Date
  updatedAt: Date
  totalChunks: number
  successfulChunks: number
  skippedChunks: number
}

const SummaryCacheSchema: Schema = new Schema({
  repoId: { type: String, required: true, unique: true, index: true },
  owner: { type: String, required: true },
  repo: { type: String, required: true },
  summaries: [
    {
      file: { type: String, required: true },
      chunk: { type: Number, required: true },
      content: { type: String, required: true },
      summary: { type: String, required: true },
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  totalChunks: { type: Number, required: true },
  successfulChunks: { type: Number, required: true },
  skippedChunks: { type: Number, default: 0 },
})

// Create a compound index for faster lookups
SummaryCacheSchema.index({ owner: 1, repo: 1 })

// Update the updatedAt field on save
SummaryCacheSchema.pre("save", function (next) {
  this.updatedAt = new Date()
  next()
})

// Check if the model already exists to prevent OverwriteModelError during hot reloads
export default mongoose.models.SummaryCache || mongoose.model<ISummaryCache>("SummaryCache", SummaryCacheSchema)
