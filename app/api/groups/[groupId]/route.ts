// app/api/groups/[groupId]/route.ts
// تم تعديل دالة DELETE لإزالة منطق المعاملات (transactions)
// لتناسب بيئات MongoDB التي لا تعمل كـ Replica Set.

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Group from '@/models/Group';
import GroupMember from '@/models/GroupMember';
import Message from '@/models/Message';
import User, { IUser } from '@/models/User';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Helper to get user ID and super admin status from token
const getAuthDetailsFromToken = (token: string) => {
  try {
    const decodedToken = jwt.verify(token, JWT_SECRET) as { id?: string; userId?: string; isSuperAdmin?: boolean };
    const userId = String(decodedToken.id || decodedToken.userId);
    const isSuperAdmin = decodedToken.isSuperAdmin || false;
    return { userId: new mongoose.Types.ObjectId(userId), isSuperAdmin };
  } catch (error) {
    console.error('Invalid token:', error);
    return { userId: null, isSuperAdmin: false };
  }
};

// GET method to fetch single group details
export async function GET(request: NextRequest, { params }: { params: { groupId: string } }) {
  await connectDB();

  try {
    const { groupId } = params;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return NextResponse.json({ success: false, error: 'معرف مجموعة غير صالح.' }, { status: 400 });
    }

    let userId: mongoose.Types.ObjectId | null = null;
    let isMember: boolean = false;
    let isAdmin: boolean = false;
    let isSuperAdminOfAnyGroup: boolean = false;
    let currentUserRole: string = 'guest';

    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decodedToken = jwt.verify(token, JWT_SECRET) as { id?: string; userId?: string; isSuperAdmin?: boolean };
        userId = new mongoose.Types.ObjectId(String(decodedToken.id || decodedToken.userId));
        isSuperAdminOfAnyGroup = decodedToken.isSuperAdmin || false; 
        
        const memberInfo = await GroupMember.findOne({ group: groupId, user: userId });
        if (memberInfo) {
          isMember = true;
          currentUserRole = memberInfo.role;
          if (memberInfo.role === 'admin') {
            isAdmin = true;
          }
        }
      } catch (jwtError: any) {
        console.warn('Invalid or expired token during group details fetch. Treating as guest.');
      }
    }

    const group = await Group.findById(groupId).lean();

    if (!group) {
      return NextResponse.json({ success: false, error: 'المجموعة غير موجودة.' }, { status: 404 });
    }

    const canEdit = isAdmin || isSuperAdminOfAnyGroup;

    type PopulatedGroupMemberUser = IUser & { _id: mongoose.Types.ObjectId };
    type PopulatedGroupMemberDoc = Omit<mongoose.Document & { user: PopulatedGroupMemberUser; role: string; joinedAt: Date; }, 'user'> & {
      user: PopulatedGroupMemberUser;
      role: string;
      joinedAt: Date;
      _id: mongoose.Types.ObjectId;
      __v?: number;
    };

    // ترتيب الأعضاء: الأدمن أولاً
    const members = (await GroupMember.find({ group: groupId })
      .populate<{ user: PopulatedGroupMemberUser; }>({
        path: 'user',
        select: 'name avatar',
        model: User
      })
      .select('user role joinedAt')
      .lean()) as unknown as PopulatedGroupMemberDoc[];

    const membersList = members
      .sort((a, b) => (a.role === 'admin' ? -1 : 1))
      .map((member: PopulatedGroupMemberDoc) => ({
        id: member.user._id.toString(),
        name: member.user.name,
        avatar: member.user.avatar || null,
        role: member.role,
        joinedAt: member.joinedAt,
      }));

    return NextResponse.json({
      success: true,
      group: {
        id: group._id,
        name: group.name,
        description: group.description,
        coverImageUrl: group.coverImageUrl || null,
        adminId: group.admin,
        memberCount: group.memberCount,
        createdAt: group.createdAt,
        currentUserRole: currentUserRole,
        isMember: isMember,
        isAdmin: isAdmin,
        canEdit: canEdit,
        members: membersList,
      },
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching group details:', error);
    return NextResponse.json({ success: false, error: error.message || 'خطأ داخلي في الخادم.' }, { status: 500 });
  }
}

// PUT method to update group details
export async function PUT(request: NextRequest, { params }: { params: { groupId: string } }) {
  await connectDB();

  try {
    const { groupId } = params;
    const { name, description, coverImageUrl } = await request.json(); 

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return NextResponse.json({ success: false, error: 'معرف مجموعة غير صالح.' }, { status: 400 });
    }

    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    const { userId, isSuperAdmin } = getAuthDetailsFromToken(token || '');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'غير مصرح لك. الرجاء تسجيل الدخول.', redirectToLogin: true }, { status: 401 });
    }

    const group = await Group.findById(groupId);

    if (!group) {
      return NextResponse.json({ success: false, error: 'المجموعة غير موجودة.' }, { status: 404 });
    }

    if (!group.admin.equals(userId) && !isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'ليس لديك صلاحية لتعديل هذه المجموعة.' }, { status: 403 });
    }

    if (name !== undefined) {
      group.name = name.trim();
    }
    if (description !== undefined) {
      group.description = description.trim();
    }

    await group.save();

    return NextResponse.json({ success: true, message: 'تم تحديث المجموعة بنجاح.', group: group }, { status: 200 });

  } catch (error: any) {
    console.error('Error updating group:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val: any) => val.message);
      return NextResponse.json({ success: false, error: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message || 'خطأ داخلي في الخادم.' }, { status: 500 });
  }
}

// DELETE method to delete a group
export async function DELETE(request: NextRequest, { params }: { params: { groupId: string } }) {
  await connectDB();

  try {
    const { groupId } = params;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return NextResponse.json({ success: false, error: 'معرف مجموعة غير صالح.' }, { status: 400 });
    }

    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    const { userId, isSuperAdmin } = getAuthDetailsFromToken(token || '');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'غير مصرح لك. الرجاء تسجيل الدخول.', redirectToLogin: true }, { status: 401 });
    }

    const group = await Group.findById(groupId);

    if (!group) {
      return NextResponse.json({ success: false, error: 'المجموعة غير موجودة بالفعل.' }, { status: 404 });
    }

    if (!group.admin.equals(userId) && !isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'ليس لديك صلاحية لحذف هذه المجموعة.' }, { status: 403 });
    }

    // --- START: Removed Transaction Logic ---
    // Instead of transactions, perform operations sequentially.
    // If one fails, the others might still be attempted or might throw errors.

    // 1. Delete all members of this group
    await GroupMember.deleteMany({ group: groupId });
    // 2. Delete all messages related to this group
    await (Message as mongoose.Model<any>).deleteMany({ group: groupId });
    // 3. Delete the group itself
    const deletedGroup = await Group.findByIdAndDelete(groupId);
    if (!deletedGroup) {
      return NextResponse.json({ success: false, error: 'المجموعة غير موجودة.' }, { status: 404 });
    }

    // --- END: Removed Transaction Logic ---

    return NextResponse.json({ success: true, message: 'تم حذف المجموعة بنجاح.' }, { status: 200 });

  } catch (error: any) {
    console.error('Error deleting group:', error);
    // Specific check for Mongoose/MongoDB errors if needed
    if (error.name === 'CastError') {
      return NextResponse.json({ success: false, error: 'صيغة معرف المجموعة غير صحيحة.' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message || 'خطأ داخلي في الخادم.' }, { status: 500 });
  }
}
