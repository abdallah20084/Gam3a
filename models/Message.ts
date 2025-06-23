// models/Message.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

// تعريف واجهة الرسالة
export interface IMessage extends Document {
  group: mongoose.Types.ObjectId; // معرف المجموعة التي تنتمي إليها الرسالة
  sender: mongoose.Types.ObjectId; // معرف المرسل
  content: string; // محتوى الرسالة
  timestamp: Date; // تاريخ ووقت إرسال الرسالة
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
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// تصدير النموذج
const Message: Model<IMessage> = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);
export default Message;
