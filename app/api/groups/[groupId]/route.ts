import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Group from '@/models/Group';
import GroupMember from '@/models/GroupMember';
import User from '@/models/User';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Helper to get user ID from token
const getUserIdFromToken = (token: string) => {
  try {
    const decodedToken = jwt.verify(token, JWT_SECRET as string) as { id?: string; userId?: string };
    return new mongoose.Types.ObjectId(String(decodedToken.id || decodedToken.userId));
  } catch (error) {
    console.error('Invalid token:', error);
    return null;
  }
};

// GET method to fetch single group details
export async function GET(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  await connectDB();

  try {
    const { groupId } = await params;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return NextResponse.json({ success: false, error: 'معرف مجموعة غير صالح.' }, { status: 400 });
    }

    // Get user ID from token
    const authHeader = request.headers.get('Authorization');
    let userId: mongoose.Types.ObjectId | null = null;
    let isMember = false;
    let isAdmin = false;
    let currentUserRole = 'guest';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      userId = getUserIdFromToken(token);
      
      if (userId) {
        const memberInfo = await GroupMember.findOne({ group: groupId, user: userId });
        if (memberInfo) {
          isMember = true;
          currentUserRole = memberInfo.role;
          isAdmin = memberInfo.role === 'admin';
        }
      }
    }

    // Get group details
    const group = await Group.findById(groupId).lean();
    if (!group) {
      return NextResponse.json({ success: false, error: 'المجموعة غير موجودة.' }, { status: 404 });
    }

    // Get group members
    const members = await GroupMember.find({ group: groupId })
      .populate('user', 'name avatar')
      .lean();

    const membersList = members
      .filter(member => member.user)
      .sort((a, b) => (a.role === 'admin' ? -1 : 1))
      .map((member: any) => ({
        id: member.user._id.toString(),
        name: member.user.name || 'مستخدم غير معروف',
        avatar: member.user.avatar || null,
        role: member.role || 'member',
        joinedAt: member.joinedAt,
      }));

    return NextResponse.json({
      success: true,
      group: {
        id: (group._id as any).toString(),
        name: group.name,
        description: group.description,
        coverImageUrl: group.coverImageUrl || null,
        adminId: group.admin.toString(),
        memberCount: group.memberCount,
        createdAt: group.createdAt,
        currentUserRole,
        isMember,
        isAdmin,
        canEdit: isAdmin,
        members: membersList,
      },
      currentUserId: userId ? userId.toString() : null,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching group details:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'خطأ داخلي في الخادم.' 
    }, { status: 500 });
  }
}

// PUT method to update group details
export async function PUT(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  await connectDB();

  try {
    const { groupId } = await params;
    const { name, description, coverImageUrl } = await request.json();

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return NextResponse.json({ success: false, error: 'معرف مجموعة غير صالح.' }, { status: 400 });
    }

    // Get user ID from token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'غير مصرح لك. الرجاء تسجيل الدخول.' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const userId = getUserIdFromToken(token);

    if (!userId) {
      return NextResponse.json({ success: false, error: 'غير مصرح لك. الرجاء تسجيل الدخول.' }, { status: 401 });
    }

    // Check if user is admin of the group
    const group = await Group.findById(groupId);
    if (!group) {
      return NextResponse.json({ success: false, error: 'المجموعة غير موجودة.' }, { status: 404 });
    }

    if (group.admin.toString() !== userId.toString()) {
      return NextResponse.json({ success: false, error: 'ليس لديك صلاحية لتعديل هذه المجموعة.' }, { status: 403 });
    }

    // Update group
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { name, description, coverImageUrl },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: 'تم تحديث المجموعة بنجاح',
      group: updatedGroup
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error updating group:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'خطأ داخلي في الخادم.' 
    }, { status: 500 });
  }
}

// DELETE method to delete group
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  await connectDB();

  try {
    const { groupId } = await params;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return NextResponse.json({ success: false, error: 'معرف مجموعة غير صالح.' }, { status: 400 });
    }

    // Get user ID from token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'غير مصرح لك. الرجاء تسجيل الدخول.' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const userId = getUserIdFromToken(token);

    if (!userId) {
      return NextResponse.json({ success: false, error: 'غير مصرح لك. الرجاء تسجيل الدخول.' }, { status: 401 });
    }

    // Check if user is admin of the group
    const group = await Group.findById(groupId);
    if (!group) {
      return NextResponse.json({ success: false, error: 'المجموعة غير موجودة.' }, { status: 404 });
    }

    if (group.admin.toString() !== userId.toString()) {
      return NextResponse.json({ success: false, error: 'ليس لديك صلاحية لحذف هذه المجموعة.' }, { status: 403 });
    }

    // Delete group and related data
    await GroupMember.deleteMany({ group: groupId });
    await Group.findByIdAndDelete(groupId);

    return NextResponse.json({
      success: true,
      message: 'تم حذف المجموعة بنجاح'
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error deleting group:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'خطأ داخلي في الخادم.' 
    }, { status: 500 });
  }
}





