// models/Group.ts
import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IGroup extends Document {
  name: string;
  description?: string;
  coverImageUrl?: string;
  admin: mongoose.Types.ObjectId; // Reference to User model
  memberCount: number; // Field to store the number of members
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  coverImageUrl: { type: String }, // Optional field for group cover image
  admin: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  memberCount: { type: Number, default: 0 }, // Initialize memberCount to 0
}, {
  timestamps: true, // Adds createdAt and updatedAt timestamps
});

const Group: Model<IGroup> = mongoose.models.Group || mongoose.model<IGroup>('Group', GroupSchema);

export default Group;
