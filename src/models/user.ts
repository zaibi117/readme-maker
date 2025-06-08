import mongoose, { Schema, type Document } from "mongoose"

export interface IUser extends Document {
  email: string
  name?: string
  image?: string
  githubId: string
  accessToken?: string
  isPremium: boolean
  readmeGenerations: {
    date: Date
    count: number
  }[]
  createdAt: Date
  updatedAt: Date
}

const UserSchema: Schema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String },
    image: { type: String },
    githubId: { type: String, required: true, unique: true },
    isPremium: { type: Boolean, default: false },
    readmeGenerations: [{ type: Schema.Types.ObjectId, ref: "Readme" }],
  },
  { timestamps: true },
)

// Create indexes for faster lookups
UserSchema.index({ email: 1 })
UserSchema.index({ githubId: 1 })

// Check if the model already exists to prevent OverwriteModelError during hot reloads
export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema)
