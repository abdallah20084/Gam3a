// types/group.d.ts
export interface Group {
  _id: string;
  name: string;
  description?: string;
  members: Array<{
    userId: string;
    role: string;
    joinedAt: Date;
  }>;
  createdAt: Date;
  createdBy: string;
}