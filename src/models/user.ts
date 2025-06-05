import mongoose, { Schema, type Document } from "mongoose"

export interface IUser extends Document {
  githubId: string
  email: string
  name: string
  image?: string
  provider: string
  accessToken?: string
  createdAt: Date
  updatedAt: Date
  lastLogin: Date
}

const UserSchema: Schema = new Schema({
  githubId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  image: { type: String },
  provider: { type: String, enum: ["github"], default: "github" },
  accessToken: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now },
})

// Create indexes for faster lookups
UserSchema.index({ email: 1 })
UserSchema.index({ githubId: 1 })

// Update the updatedAt field before saving
UserSchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

// Check if the model already exists to prevent OverwriteModelError during hot reloads
export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema)
