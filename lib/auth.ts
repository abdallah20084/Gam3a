// إضافة دالة للتحقق من صلاحية التوكن
import jwt from 'jsonwebtoken';

export const validateToken = (token: string | null): boolean => {
  if (!token) return false;
  
  try {
    // تحقق من صلاحية التوكن بدون التحقق من التوقيع
    const decoded = jwt.decode(token);
    if (!decoded) return false;
    
    // تحقق من انتهاء صلاحية التوكن
    const exp = (decoded as any).exp;
    if (!exp) return false;
    
    // تحقق مما إذا كان التوكن منتهي الصلاحية
    return Date.now() < exp * 1000;
  } catch (error) {
    console.error("Token validation error:", error);
    return false;
  }
};

// استخدام هذه الدالة قبل إرسال الطلبات
export const getValidToken = (): string | null => {
  const token = localStorage.getItem('token');
  if (validateToken(token)) {
    return token;
  }
  // إذا كان التوكن غير صالح، قم بإزالته
  localStorage.removeItem('token');
  return null;
};