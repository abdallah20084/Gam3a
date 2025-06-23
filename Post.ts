// models/Post.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IPost extends Document {
  content?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'pdf' | 'voice' | 'link' | 'text';
  isNsfw: boolean;
  createdAt: Date;
  updatedAt: Date;
  group: mongoose.Types.ObjectId; // مرجع لـ Group ObjectId
  author: mongoose.Types.ObjectId; // مرجع لـ User ObjectId
}

const PostSchema: Schema = new Schema({
  content: {
    type: String,
    trim: true,
  },
  mediaUrl: {
    type: String, // رابط للملف (صورة، فيديو) الذي تم رفعه
  },
  mediaType: {
    type: String, // نوع الوسائط: "image", "video", "pdf", "voice", "link"
    enum: ['image', 'video', 'pdf', 'voice', 'link', 'text'], // أنواع الوسائط المسموح بها
    default: 'text', // افتراضيا، يمكن أن يكون المنشور نصًا فقط
  },
  isNsfw: {
    type: Boolean,
    default: false, // هل تم تصنيف المحتوى على أنه NSFW؟ (مخفي/محظور إذا كان true)
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  group: {
    type: Schema.Types.ObjectId,
    ref: 'Group', // يشير إلى نموذج Group
    required: true,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User', // يشير إلى نموذج User
    required: true,
  },
});

const Post = mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema);

export default Post;