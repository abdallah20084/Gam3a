// models/User.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  password?: string;
  avatar?: string;
  isVerified: boolean;
  isSuperAdmin: boolean; // New field: to denote super admin status
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 50 },
  phone: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  avatar: { type: String },
  isVerified: { type: Boolean, default: false },
  isSuperAdmin: { type: Boolean, default: false }, // Default is false
}, {
  timestamps: true,
});

const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
