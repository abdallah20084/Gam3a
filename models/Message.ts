// models/Message.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

// تعريف واجهة الرسالة
export interface IMessage extends Document {
  group: mongoose.Types.ObjectId; // معرف المجموعة التي تنتمي إليها الرسالة
  sender: mongoose.Types.ObjectId; // معرف المرسل
  content: string; // محتوى الرسالة
  type: string; // نوع الرسالة
  timestamp: Date; // تاريخ ووقت إرسال الرسالة
  reactions?: { emoji: string; users: mongoose.Types.ObjectId[] }[];
  replyTo?: mongoose.Types.ObjectId | null;
  // يمكنك إضافة حقول أخرى هنا مثل: type (text, image, video), attachments, readBy, etc.
}

// تعريف Schema للرسالة
const MessageSchema: Schema = new Schema({
  group: {
    type: Schema.Types.ObjectId,
    ref: 'Group', // يشير إلى نموذج Group
    required: true,
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User', // يشير إلى نموذج User
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true, // إزالة المسافات البيضاء الزائدة
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'file', 'pdf', 'system'],
    default: 'text',
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  reactions: [
    {
      emoji: { type: String, required: true },
      users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    }
  ],
  replyTo: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
    default: null,
  },
});

// تصدير النموذج
const Message: Model<IMessage> = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);
export default Message;
