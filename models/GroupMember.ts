import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGroupMember extends Document {
  user: Types.ObjectId;
  group: Types.ObjectId;
  role: 'admin' | 'member';
  joinedAt: Date;
}

const GroupMemberSchema = new Schema<IGroupMember>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    group: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// إنشاء فهرس مركب للتأكد من أن كل مستخدم ينضم إلى مجموعة مرة واحدة فقط
GroupMemberSchema.index({ user: 1, group: 1 }, { unique: true });

export default mongoose.models.GroupMember || mongoose.model<IGroupMember>('GroupMember', GroupMemberSchema);

