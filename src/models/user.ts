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
  email: { type: String, required: true, unique: true, index: true }, // ✅ only index here
  name: { type: String, required: true },
  image: { type: String },
  provider: { type: String, enum: ["github"], default: "github" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now },
})

// Only one manual index needed now
UserSchema.index({ githubId: 1 })

UserSchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema)
