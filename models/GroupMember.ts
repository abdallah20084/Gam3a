// models/GroupMember.ts
import mongoose, { Document, Schema, Model } from 'mongoose';
import { IUser } from './User';

export interface IGroupMember extends Document {
  group: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId | IUser;
  role: 'admin' | 'member';
  joinedAt: Date;
}

const GroupMemberSchema: Schema = new Schema({
  group: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['admin', 'member'], default: 'member' },
  joinedAt: { type: Date, default: Date.now }
});

const GroupMember: Model<IGroupMember> = mongoose.models.GroupMember || mongoose.model<IGroupMember>('GroupMember', GroupMemberSchema);

export default GroupMember;
