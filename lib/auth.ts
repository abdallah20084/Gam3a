// إضافة دالة للتحقق من صلاحية التوكن
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface TokenPayload {
  userId: string;
  email: string;
  exp: number;
}

export const validateToken = (token: string | null): boolean => {
  if (!token) return false;
  
  try {
    const decoded = jwt.decode(token) as TokenPayload | null;
    if (!decoded) return false;
    
    const exp = decoded.exp;
    if (!exp) return false;
    
    return Date.now() < exp * 1000;
  } catch (error) {
    console.error("Token validation error:", error);
    return false;
  }
};

// دالة فحص التوكن مع الخادم
export const validateTokenWithServer = async (token: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/user/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.status === 401) {
      clearUserData();
      return false;
    }
    
    return response.ok;
  } catch (error) {
    console.error('Error validating token with server:', error);
    return false;
  }
};

// استخدام هذه الدالة قبل إرسال الطلبات
export const getValidToken = (): string | null => {
  const token = localStorage.getItem('token');
  if (validateToken(token)) {
    return token;
  }
  clearUserData();
  return null;
};

export const clearUserData = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  localStorage.removeItem('userName');
  localStorage.removeItem('userEmail');
};

export const setUserData = (token: string, user: { id: string; name: string; email: string }): void => {
  localStorage.setItem('token', token);
  localStorage.setItem('userId', user.id);
  localStorage.setItem('userName', user.name);
  localStorage.setItem('userEmail', user.email);
};

export const getUserData = () => {
  return {
    token: localStorage.getItem('token'),
    userId: localStorage.getItem('userId'),
    userName: localStorage.getItem('userName'),
    userEmail: localStorage.getItem('userEmail'),
  };
};

export const generateToken = (payload: Omit<TokenPayload, 'exp'>): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
};