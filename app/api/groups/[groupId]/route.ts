import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Group from '@/models/Group';
import GroupMember from '@/models/GroupMember';
import Message from '@/models/Message';
import User, { IUser } from '@/models/User';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { IGroupMember } from '@/models/GroupMember';

// Define a type for the populated user in lean query results
type PopulatedUser = {
  _id: mongoose.Types.ObjectId | string;
  name: string;
  avatar?: string;
};

// Define a type for the member document with populated user
type MemberWithPopulatedUser = {
  _id: mongoose.Types.ObjectId | string;
  user: PopulatedUser;
  role: string;
  joinedAt: Date;
  group: mongoose.Types.ObjectId | string;
};

// Be explicit about the route's dynamic nature, which is a good practice in Next.js.
export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set.');
}

// تحسين تعريف الأنواع
type DecodedToken = {
  id?: string;
  userId?: string;
  isSuperAdmin?: boolean;
};

// A more robust function to extract authentication details from a JWT.
const getAuthDetailsFromToken = (token: string | undefined) => {
  try {
    if (!token) {
      return { userId: null, isSuperAdmin: false };
    }
    const decodedToken = jwt.verify(token, JWT_SECRET) as DecodedToken;
    const userIdStr = String(decodedToken.id || decodedToken.userId);

    if (!mongoose.Types.ObjectId.isValid(userIdStr)) {
      console.warn('Invalid ObjectId in token:', userIdStr);
      return { userId: null, isSuperAdmin: false };
    }

    return { 
      userId: new mongoose.Types.ObjectId(userIdStr), 
      isSuperAdmin: decodedToken.isSuperAdmin || false 
    };
  } catch (error) {
    // Catches JWT errors (expired, malformed, etc.)
    console.warn('Token verification failed:', error instanceof Error ? error.message : error);
    return { userId: null, isSuperAdmin: false };
  }
};

// Centralized function to get user's authentication and authorization status for a group.
async function getAuthStatus(request: NextRequest, groupId?: string) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
  const { userId, isSuperAdmin } = getAuthDetailsFromToken(token);

  if (!userId) {
    return { userId: null, isSuperAdmin: false, isMember: false, isAdmin: false, role: 'guest' };
  }

  const memberInfo = (groupId && mongoose.Types.ObjectId.isValid(groupId))
    ? await GroupMember.findOne({ group: groupId, user: userId }).lean()
    : null;

  return { userId, isSuperAdmin, isMember: !!memberInfo, isAdmin: memberInfo?.role === 'admin', role: memberInfo?.role || 'guest' };
}

// تحسين دالة GET
export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
): Promise<NextResponse> {
  await connectDB();

  try {
    const { groupId } = params;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return NextResponse.json(
        { success: false, error: 'معرف مجموعة غير صالح.' },
        { status: 400 }
      );
    }

    const auth = await getAuthStatus(request, groupId);

    const group = await Group.findById(groupId).lean();
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'المجموعة غير موجودة.' },
        { status: 404 }
      );
    }

    const members = await GroupMember.find({ group: groupId })
      .populate('user', 'name avatar')
      .select('user role joinedAt')
      .lean();
    
    // Type assertion for the populated members
    const populatedMembers = members as unknown as MemberWithPopulatedUser[];

    const membersList = populatedMembers
      .sort((a, b) => (a.role === 'admin' ? -1 : 1))
      .map(member => ({
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
        currentUserRole: auth.role,
        isMember: auth.isMember,
        isAdmin: auth.isAdmin,
        canEdit: auth.isAdmin || auth.isSuperAdmin,
        members: membersList,
      },
    });

  } catch (error) {
    console.error('Error fetching group details:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'خطأ داخلي في الخادم.' 
      },
      { status: 500 }
    );
  }
}

// تحسين دالة PUT
export async function PUT(
  request: NextRequest,
  { params }: { params: { groupId: string } }
): Promise<NextResponse> {
  await connectDB();

  try {
    const { groupId } = params;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return NextResponse.json(
        { success: false, error: 'معرف مجموعة غير صالح.' },
        { status: 400 }
      );
    }

    const auth = await getAuthStatus(request);
    if (!auth.userId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'غير مصرح لك. الرجاء تسجيل الدخول.',
          redirectToLogin: true 
        },
        { status: 401 }
      );
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'المجموعة غير موجودة.' },
        { status: 404 }
      );
    }

    if (!group.admin.equals(auth.userId) && !auth.isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: 'ليس لديك صلاحية لتعديل هذه المجموعة.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description } = body;
    if (name) group.name = name.trim();
    if (description) group.description = description.trim();

    await group.save();

    return NextResponse.json({
      success: true,
      message: 'تم تحديث المجموعة بنجاح.',
      group
    });

  } catch (error: any) {
    console.error('Error updating group:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors)
        .map((err: any) => err.message)
        .join(', ');
      return NextResponse.json(
        { success: false, error: messages },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'خطأ داخلي في الخادم.' },
      { status: 500 }
    );
  }
}

// تحسين دالة DELETE
export async function DELETE(
  request: NextRequest,
  { params }: { params: { groupId: string } }
): Promise<NextResponse> {
  await connectDB();
  const session = await mongoose.startSession();

  try {
    const { groupId } = params;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return NextResponse.json(
        { success: false, error: 'معرف مجموعة غير صالح.' },
        { status: 400 }
      );
    }

    const auth = await getAuthStatus(request);
    if (!auth.userId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'غير مصرح لك. الرجاء تسجيل الدخول.',
          redirectToLogin: true 
        },
        { status: 401 }
      );
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'المجموعة غير موجودة.' },
        { status: 404 }
      );
    }

    if (!group.admin.equals(auth.userId) && !auth.isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: 'ليس لديك صلاحية لحذف هذه المجموعة.' },
        { status: 403 }
      );
    }

    // استخدام معاملة لضمان حذف كل البيانات المرتبطة بشكل آمن
    await session.withTransaction(async () => {
      await GroupMember.deleteMany({ group: groupId }, { session });
      await Message.deleteMany({ group: groupId }, { session });
      await Group.findByIdAndDelete(groupId, { session });
    });

    return NextResponse.json({
      success: true,
      message: 'تم حذف المجموعة بنجاح.'
    });

  } catch (error: any) {
    console.error('Error deleting group:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'فشل حذف المجموعة. ' + (error.message || 'خطأ داخلي في الخادم.')
      },
      { status: 500 }
    );
  } finally {
    // التأكد من إغلاق الجلسة دائمًا
    await session.endSession();
  }
}
