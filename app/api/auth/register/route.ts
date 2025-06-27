// app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// تأكد أن هذا المفتاح السري يطابق تماماً المفتاح في ملف .env
// ونفس المفتاح في server.ts
const JWT_SECRET = process.env.JWT_SECRET;

// إذا لم يتم تعريف JWT_SECRET في .env، فسيتم رمي خطأ عند بدء تشغيل الخادم
if (!JWT_SECRET) {
  console.error('JWT_SECRET is not defined in environment variables. Please set it in your .env file.');
  throw new Error('JWT_SECRET environment variable is not set. Please set it in your .env file.');
}

export async function POST(request: Request) {
  await connectDB();

  try {
    const { name, phone, password } = await request.json();

    if (!name || !phone || !password) {
      return NextResponse.json({ error: 'الرجاء إدخال جميع الحقول المطلوبة.' }, { status: 400 });
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return NextResponse.json({ error: 'رقم الهاتف هذا مسجل بالفعل.' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      phone,
      password: hashedPassword,
      isVerified: true, // Assuming direct activation as discussed previously
    });

    await newUser.save();

    // هنا يتم توقيع الرمز المميز
    const token = jwt.sign(
      { id: (newUser._id as any).toString(), phone: newUser.phone, name: newUser.name },
      JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    // إرجاع userId و userName بالإضافة إلى التوكن
    return NextResponse.json({
        message: 'تم التسجيل بنجاح!',
        token,
        userName: newUser.name,
        userId: (newUser._id as any).toString()
    }, { status: 201 });

  } catch (error: any) {
    console.error('Registration API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع أثناء التسجيل.' }, { status: 500 });
  }
}
