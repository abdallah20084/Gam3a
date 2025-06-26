// models/Message.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMessage extends Document {
  content: string;
  type: 'text' | 'image' | 'video' | 'file' | 'pdf' | 'system';
  sender: mongoose.Types.ObjectId;
  group: mongoose.Types.ObjectId;
  replyTo?: mongoose.Types.ObjectId;
  timestamp: Date;
  reactions?: Array<{
    emoji: string;
    users: mongoose.Types.ObjectId[];
  }>;
  attachments?: Array<{
    url: string;
    type: string;
    name?: string;
    size?: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    content: {
      type: String,
      required: function(this: IMessage) {
        // محتوى مطلوب إلا إذا كان هناك مرفقات
        return !(this.attachments && this.attachments.length > 0);
      },
      trim: true
    },
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'file', 'pdf', 'system'],
      default: 'text'
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: 'Message'
    },
    reactions: [
      {
        emoji: String,
        users: [{ type: Schema.Types.ObjectId, ref: 'User' }]
      }
    ],
    attachments: [
      {
        url: { type: String, required: true },
        type: { type: String, required: true },
        name: String,
        size: Number
      }
    ]
  },
  { timestamps: true }
);

// إنشاء فهرس للبحث السريع
MessageSchema.index({ group: 1, createdAt: -1 });

// تصدير النموذج مع تحديد النوع بشكل صحيح
const Message: Model<IMessage> = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);

export default Message;



