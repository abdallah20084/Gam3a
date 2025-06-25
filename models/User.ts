// models/User.ts
import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IUser extends Document {
  name: string;
  phone: string;
  password?: string;
  isVerified?: boolean;
  avatar?: string;
  groups: mongoose.Types.ObjectId[]; // إضافة خاصية groups
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  avatar: { type: String },
  groups: [{ type: Schema.Types.ObjectId, ref: 'Group' }],
  // أضف أي حقول إضافية هنا حسب الحاجة
}, { timestamps: true });

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;




