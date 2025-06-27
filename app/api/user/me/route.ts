// app/api/user/me/route.ts
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db';
import User from '@/models/User';
import mongoose from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key'; // تأكد أنه نفس المفتاح في ملفات auth الأخرى

export async function GET(request: Request) {
  await connectDB();

  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'غير مصرح به' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let userId: mongoose.Types.ObjectId;

    try {
      const decodedToken: any = jwt.verify(token, JWT_SECRET);
      userId = new mongoose.Types.ObjectId(String(decodedToken.id)); // تأكد من استخدام 'id' هنا
    } catch (jwtError: any) {
      console.warn('Invalid or expired token for /api/user/me:', jwtError.message);
      return NextResponse.json({ success: false, error: 'جلسة غير صالحة أو منتهية الصلاحية' }, { status: 401 });
    }

    const user = await User.findById(userId).select('-password'); // لا ترجع كلمة المرور

    if (!user) {
      console.warn(`User with ID ${userId.toString()} not found for /api/user/me. Token may be invalid or user deleted.`);
      return NextResponse.json({ 
        success: false, 
        error: 'المستخدم غير موجود في قاعدة البيانات. يرجى تسجيل الدخول مرة أخرى.',
        redirectToLogin: true 
      }, { status: 401 });
    }

    // إذا وصل هنا، فالتوكن صالح والمستخدم موجود.
    return NextResponse.json({
      success: true,
      message: 'تم التحقق من المستخدم بنجاح.',
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        // يمكنك إضافة المزيد من بيانات المستخدم هنا إذا لزم الأمر، باستثناء الحساسة
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error in /api/user/me:', error);
    return NextResponse.json({ success: false, error: error.message || 'خطأ داخلي في الخادم.' }, { status: 500 });
  }
}