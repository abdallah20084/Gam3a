// models/Message.ts
import mongoose, { Schema, Document } from 'mongoose';
import type { IUser } from '@/models/User';

// تعريف الواجهة IMessage
export interface IMessage extends Document {
  group: mongoose.Types.ObjectId;
  sender: mongoose.PopulatedDoc<IUser, mongoose.Types.ObjectId>;
  content: string;
  timestamp: Date;
}

// تعريف مخطط الرسالة
const MessageSchema: Schema = new Schema({
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, maxlength: 1000 },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);
