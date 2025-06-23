// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken'; // <--- FIX: Corrected import to * as jwt

// تأكد أن هذا المفتاح السري يطابق تماماً المفتاح في ملف .env
// ونفس المفتاح في server.ts
// يفضل استخدام متغيرات البيئة مباشرة لضمان الاتساق.
const JWT_SECRET = process.env.JWT_SECRET;

// إذا لم يتم تعريف JWT_SECRET في .env، فسيستخدم قيمة افتراضية.
// ولكن يفضل التأكد من تعريفه في .env لتجنب مشاكل الأمان.
if (!JWT_SECRET) {
  console.error('JWT_SECRET is not defined in environment variables. Using a fallback.');
  // يمكنك رمي خطأ أو استخدام مفتاح سري قوي افتراضي، لكن هذا ليس آمناً للإنتاج.
  // في بيئة الإنتاج، يجب أن يكون معرّفاً دائماً.
  // لأغراض التطوير، يمكن أن نضيف مفتاحاً افتراضياً قوياً هنا.
  // For now, let's throw an error to make it explicit for dev
  throw new Error('JWT_SECRET environment variable is not set. Please set it in your .env file.');
}


export async function POST(request: Request) {
  await connectDB();

  try {
    const { phone, password } = await request.json();

    if (!phone || !password) {
      return NextResponse.json({ error: 'الرجاء إدخال رقم الهاتف وكلمة المرور.' }, { status: 400 });
    }

    const user = await User.findOne({ phone });

    if (!user) {
      return NextResponse.json({ error: 'رقم الهاتف أو كلمة المرور غير صحيحة.' }, { status: 400 });
    }

    // تأكد أن user.password موجود قبل المقارنة
    if (!user.password) {
        return NextResponse.json({ error: 'كلمة مرور المستخدم غير موجودة.' }, { status: 500 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'رقم الهاتف أو كلمة المرور غير صحيحة.' }, { status: 400 });
    }

    // هنا يتم توقيع الرمز المميز
    const token = jwt.sign(
      { id: user._id.toString(), phone: user.phone, name: user.name }, // <--- id يجب أن يكون string
      JWT_SECRET, // <--- استخدام المفتاح السري المعرف
      { expiresIn: '7d' }
    );

    // أيضاً، قم بتخزين userId في localStorage لكي يتم استخدامه للتعرف على المستخدم في الواجهة الأمامية
    return NextResponse.json({
        message: 'تم تسجيل الدخول بنجاح!',
        token,
        userName: user.name,
        userId: user._id.toString() // <--- إضافة userId إلى الاستجابة
    }, { status: 200 });

  } catch (error: any) {
    console.error('Login API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع أثناء تسجيل الدخول.' }, { status: 500 });
  }
}
