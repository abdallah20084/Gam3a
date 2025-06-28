// app/api/groups/route.ts
// هذا الملف يتعامل مع إنشاء مجموعات جديدة (HTTP POST) وجلب قائمة المجموعات (HTTP GET).
// تم تعديله ليعمل بدون next-auth، مع التحقق المباشر من JWT.

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Group from '@/models/Group';
import User from '@/models/User';   // نحتاجه لربط المجموعة بالمسؤول
import GroupMember from '@/models/GroupMember'; // نحتاجه لفلترة المجموعات المنضمة
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// دالة مساعدة لاستخراج معرف المستخدم وصلاحيات السوبر أدمن من التوكن
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

// معالج طلب POST لإنشاء مجموعة جديدة
export async function POST(req: NextRequest) {
  await connectDB(); // الاتصال بقاعدة البيانات

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'غير مصرح لك. الرجاء تسجيل الدخول.' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const { userId } = getAuthDetailsFromToken(token || '');

    if (!userId) {
      return NextResponse.json({ error: 'غير مصرح لك. الرجاء تسجيل الدخول.' }, { status: 401 });
    }

    const { name, description, coverImageUrl } = await req.json();

    // التحقق من صحة البيانات
    if (!name || !description) {
      return NextResponse.json({ error: 'الاسم والوصف مطلوبان.' }, { status: 400 });
    }

    // إنشاء مجموعة جديدة
    const newGroup = await Group.create({
      name,
      description,
      coverImageUrl,
      admin: userId, // تعيين المستخدم الحالي كمسؤول للمجموعة
      memberCount: 0, // عدد الأعضاء يبدأ من صفر
    });

    // إضافة مسؤول المجموعة كأول عضو فيها
    const adminMember = new GroupMember({
        group: newGroup._id,
        user: userId,
        role: 'admin', // تعيين دور المسؤول
    });
    await adminMember.save();

    // زيادة عدد الأعضاء في المجموعة بعد إضافة المسؤول
    newGroup.memberCount = 1;
    await newGroup.save();

    return NextResponse.json({ message: 'تم إنشاء المجموعة بنجاح', group: newGroup }, { status: 201 });
  } catch (error: any) {
    console.error('خطأ في إنشاء المجموعة:', error);
    // Handle duplicate key error (if group name is unique)
    if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
      return NextResponse.json({ error: 'اسم المجموعة هذا موجود بالفعل. الرجاء اختيار اسم آخر.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'فشل في إنشاء المجموعة', details: error.message }, { status: 500 });
  }
}

// معالج طلب GET لجلب المجموعات
export async function GET(req: NextRequest) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const tabType = searchParams.get('tabType') || 'all'; // 'all', 'joined', 'myGroups'
  const searchTerm = searchParams.get('search') || '';

  const token = req.headers.get('authorization')?.split(' ')[1];
  let currentUserId: mongoose.Types.ObjectId | null = null;

  if (token) {
    try {
      const decodedToken = jwt.verify(token, JWT_SECRET as string) as { id?: string; userId?: string; isSuperAdmin?: boolean };
      currentUserId = new mongoose.Types.ObjectId(String(decodedToken.id || decodedToken.userId));
    } catch (jwtError) {
      console.warn('Invalid token for fetching groups:', jwtError);
      currentUserId = null;
      if (tabType === 'joined' || tabType === 'myGroups') {
        return NextResponse.json({ error: 'جلسة غير صالحة. الرجاء تسجيل الدخول.', redirectToLogin: true }, { status: 401 });
      }
    }
  } else {
    if (tabType === 'joined' || tabType === 'myGroups') {
      return NextResponse.json({ error: 'الرجاء تسجيل الدخول لعرض هذه المجموعات.', redirectToLogin: true }, { status: 401 });
    }
  }

  try {
    let query: any = {};

    if (searchTerm) {
      query.name = { $regex: searchTerm, $options: 'i' };
    }

    if (tabType === 'joined') {
      if (!currentUserId) {
         return NextResponse.json({ error: 'الرجاء تسجيل الدخول لعرض مجموعاتك المنضمة.', redirectToLogin: true }, { status: 401 });
      }
      const joinedGroups = await GroupMember.find({ user: currentUserId }).select('group').lean();
      const joinedGroupIds = joinedGroups.map(gm => gm.group);
      query._id = { $in: joinedGroupIds };
    } else if (tabType === 'myGroups') {
      if (!currentUserId) {
        return NextResponse.json({ error: 'الرجاء تسجيل الدخول لعرض المجموعات التي تديرها.', redirectToLogin: true }, { status: 401 });
      }
      query.admin = currentUserId;
    }

    const skip = (page - 1) * limit;
    const totalGroups = await Group.countDocuments(query);
    const groups = await Group.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const formattedGroups = await Promise.all(
      groups.map(async (group) => {
        let isMember = false;
        let isAdminOfThisGroup = false; 
        let canEdit = false;

        if (currentUserId) {
          isMember = !!(await GroupMember.exists({ group: group._id, user: currentUserId }));
          isAdminOfThisGroup = group.admin.equals(currentUserId);
          canEdit = isAdminOfThisGroup;
        }

        return {
          _id: (group._id as any).toString(),
          name: group.name,
          description: group.description,
          coverImageUrl: group.coverImageUrl,
          adminId: group.admin.toString(),
          memberCount: group.memberCount,
          createdAt: group.createdAt?.toISOString(),
          isMember: isMember,
          isAdmin: isAdminOfThisGroup,
          canEdit: canEdit,
        };
      })
    );

    return NextResponse.json({
      groups: formattedGroups,
      totalPages: Math.ceil(totalGroups / limit),
      currentPage: page,
      totalGroups,
      isLoggedIn: !!currentUserId,
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching groups:', error);
    return NextResponse.json({ error: 'فشل في جلب المجموعات.' }, { status: 500 });
  }
}

// GET method to fetch all groups
export async function GET(request: NextRequest) {
  await connectDB();

  try {
    // Get user ID from token
    const authHeader = request.headers.get('Authorization');
    let userId: mongoose.Types.ObjectId | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      userId = getAuthDetailsFromToken(token).userId;
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'غير مصرح لك. الرجاء تسجيل الدخول.' }, { status: 401 });
    }

    // Debug: Check all groups and members
    console.log('🔍 Debug: Checking all groups and members...');
    
    const allGroups = await Group.find().lean();
    console.log('🔍 All groups:', allGroups.length);
    
    const allGroupMembers = await GroupMember.find().populate('user', 'name avatar').lean();
    console.log('🔍 All group members:', allGroupMembers.length);
    
    const allUsers = await User.find().lean();
    console.log('🔍 All users:', allUsers.length);

    // Get user's groups
    const userGroups = await GroupMember.find({ user: userId })
      .populate('group', 'name description memberCount')
      .lean();

    const groups = userGroups.map((userGroup: any) => ({
      id: userGroup.group._id.toString(),
      name: userGroup.group.name,
      description: userGroup.group.description,
      memberCount: userGroup.group.memberCount,
      role: userGroup.role,
      joinedAt: userGroup.joinedAt,
    }));

    return NextResponse.json({
      success: true,
      groups,
      debug: {
        totalGroups: allGroups.length,
        totalGroupMembers: allGroupMembers.length,
        totalUsers: allUsers.length,
        userGroups: userGroups.length
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching groups:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'خطأ داخلي في الخادم.' 
    }, { status: 500 });
  }
}
