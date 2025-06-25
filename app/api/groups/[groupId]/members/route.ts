// app/api/groups/[groupId]/members/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import GroupMember from '@/models/GroupMember';
import Group from '@/models/Group';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set.');
}

const getUserIdFromToken = (token: string) => {
  try {
    const decodedToken = jwt.verify(token, JWT_SECRET) as { id?: string; userId?: string; isSuperAdmin?: boolean };
    return new mongoose.Types.ObjectId(String(decodedToken.id || decodedToken.userId));
  } catch (error) {
    console.error('Invalid token:', error);
    return null;
  }
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  await connectDB();
  const { groupId } = await params;

  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    return NextResponse.json({ error: 'معرف مجموعة غير صالح.' }, { status: 400 });
  }

  const token = req.headers.get('authorization')?.split(' ')[1];
  const userId = token ? getUserIdFromToken(token) : null;

  if (!userId) {
    return NextResponse.json({ error: 'غير مصرح لك. الرجاء تسجيل الدخول.' }, { status: 401 });
  }

  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return NextResponse.json({ error: 'المجموعة غير موجودة.' }, { status: 404 });
    }

    const existingMember = await GroupMember.findOne({ group: groupId, user: userId });
    if (existingMember) {
      return NextResponse.json({ message: 'أنت بالفعل عضو في هذه المجموعة.' }, { status: 200 });
    }

    const newMember = new GroupMember({
      group: groupId,
      user: userId,
      role: 'member',
    });
    await newMember.save();

    group.memberCount = (group.memberCount || 0) + 1;
    await group.save();

    return NextResponse.json({ message: 'تم الانضمام إلى المجموعة بنجاح.' }, { status: 201 });
  } catch (error: any) {
    console.error('Error joining group:', error);
    if (error.code === 11000) {
      return NextResponse.json({ error: 'أنت بالفعل عضو في هذه المجموعة.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'فشل الانضمام إلى المجموعة.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  await connectDB();
  const { groupId } = await params;

  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    return NextResponse.json({ error: 'معرف مجموعة غير صالح.' }, { status: 400 });
  }

  const token = req.headers.get('authorization')?.split(' ')[1];
  const userId = token ? getUserIdFromToken(token) : null;

  if (!userId) {
    return NextResponse.json({ error: 'غير مصرح لك. الرجاء تسجيل الدخول.' }, { status: 401 });
  }

  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return NextResponse.json({ error: 'المجموعة غير موجودة.' }, { status: 404 });
    }

    const deletedMember = await GroupMember.findOneAndDelete({ group: groupId, user: userId });

    if (!deletedMember) {
      return NextResponse.json({ message: 'أنت لست عضواً في هذه المجموعة.' }, { status: 200 });
    }

    group.memberCount = Math.max(0, (group.memberCount || 0) - 1);
    await group.save();

    return NextResponse.json({ message: 'تم مغادرة المجموعة بنجاح.' }, { status: 200 });
  } catch (error: any) {
    console.error('Error leaving group:', error);
    return NextResponse.json({ error: 'فشل مغادرة المجموعة.' }, { status: 500 });
  }
}
