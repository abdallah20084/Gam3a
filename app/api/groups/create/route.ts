import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db';
import Group from '@/models/Group';
import User from '@/models/User';
import GroupMember from '@/models/GroupMember'; // <--- تأكد من استيراد GroupMember
import mongoose from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

export async function POST(request: Request) {
  await connectDB();

  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'غير مصرح به', redirectToLogin: true }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let userId: mongoose.Types.ObjectId;
    try {
      const decodedToken: any = jwt.verify(token, JWT_SECRET);
      userId = new mongoose.Types.ObjectId(String(decodedToken.id || decodedToken.userId));
    } catch (jwtError: any) {
      console.error('Token verification failed:', jwtError);
      return NextResponse.json({ success: false, error: 'جلسة غير صالحة أو منتهية الصلاحية', redirectToLogin: true }, { status: 401 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'المستخدم غير موجود', redirectToLogin: true }, { status: 404 });
    }

    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json({ success: false, error: 'اسم المجموعة مطلوب.' }, { status: 400 });
    }
    if (name.length < 3 || name.length > 100) {
      return NextResponse.json({ success: false, error: 'يجب أن يتراوح طول اسم المجموعة بين 3 و 100 حرف.' }, { status: 400 });
    }
    if (description && description.length > 500) {
      return NextResponse.json({ success: false, error: 'يجب ألا يتجاوز طول الوصف 500 حرف.' }, { status: 400 });
    }

    // 1. إنشاء المجموعة
    // @ts-ignore
    const newGroup = await Group.create({
      name,
      description,
      creator: userId,
      admin: userId, // المنشئ هو المدير تلقائ
      // ازالة members و currentMembers من Group model إذا كنت ستعتمد على GroupMember
      // members: [userId],
      // currentMembers: 1,
    });

    // 2. إنشاء عضوية للمستخدم المنشئ في GroupMember model (هام)
    const newGroupMember = new GroupMember({
      user: userId,
      group: newGroup._id,
      role: 'admin', // تعيين الدور كـ 'admin'
    });
    await newGroupMember.save();


    // 3. تحديث المستخدم لإضافة المجموعة إلى "مجموعاتي"
    if (!user.groups) {
        user.groups = []; // تهيئة إذا لم تكن موجودة
    }
    // تحويل _id إلى ObjectId صريح
    user.groups.push(new mongoose.Types.ObjectId(newGroup._id.toString()));
    await user.save();

    // 4. إرجاع استجابة النجاح
    return NextResponse.json({ success: true, message: 'تم إنشاء المجموعة بنجاح.', group: newGroup }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating group:', error);
    return NextResponse.json({ success: false, error: error.message || 'خطأ داخلي في الخادم.' }, { status: 500 });
  }
}

