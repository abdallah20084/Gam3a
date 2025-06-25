import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGroup extends Document {
  name: string;
  description?: string;
  admin: Types.ObjectId;
  coverImageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema = new Schema<IGroup>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    admin: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    coverImageUrl: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Group || mongoose.model<IGroup>('Group', GroupSchema);

