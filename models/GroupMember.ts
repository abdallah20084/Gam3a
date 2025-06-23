// models/GroupMember.ts
import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IGroupMember extends Document {
  group: mongoose.Types.ObjectId; // Reference to Group model
  user: mongoose.Types.ObjectId;   // Reference to User model
  role: 'admin' | 'member'; // Role within the group
  joinedAt: Date;
}

const GroupMemberSchema: Schema = new Schema({
  group: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['admin', 'member'], default: 'member' },
  joinedAt: { type: Date, default: Date.now },
});

// Ensure a user can only be a member of a specific group once
GroupMemberSchema.index({ group: 1, user: 1 }, { unique: true });

const GroupMember: Model<IGroupMember> = mongoose.models.GroupMember || mongoose.model<IGroupMember>('GroupMember', GroupMemberSchema);

export default GroupMember;
