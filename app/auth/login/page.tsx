// app/auth/login/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await axios.get('/api/user/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.status === 200) {
            router.replace('/'); // Redirect to homepage after successful login if already logged in
          }
        } catch (err: any) {
          if (axios.isAxiosError(err) && err.response && (err.response.status === 401 || err.response.status === 403)) {
            console.warn('Unauthorized or Forbidden: Removing invalid token and user data from localStorage.');
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
            localStorage.removeItem('userName');
            localStorage.removeItem('isSuperAdmin');
          } else {
            console.error('Failed to verify token on login page due to network or server error:', err);
          }
        }
      }
    };
    checkAuthStatus();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let formattedPhone = phone;
    if (formattedPhone.startsWith('0')) {
      formattedPhone = formattedPhone.substring(1);
    }
    formattedPhone = '+2' + formattedPhone;

    try {
      const response = await axios.post('/api/auth/login', { phone: formattedPhone, password });
      
      if (response.status === 200 && response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('userName', response.data.userName);
        localStorage.setItem('userId', response.data.userId);
        localStorage.setItem('isSuperAdmin', response.data.isSuperAdmin ? 'true' : 'false');
        
        router.push('/'); // Redirect to homepage after successful new login
      } else if (response.data.redirectToVerify && response.data.phone) {
        setError(response.data.message || 'حسابك غير مفعل. الرجاء توجيهك لصفحة التحقق.');
        router.push(`/auth/verify-otp?phone=${encodeURIComponent(response.data.phone)}`);
      } else {
        setError('خطأ غير معروف في تسجيل الدخول. الرجاء المحاولة مرة أخرى.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (axios.isAxiosError(err) && err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar />
      
      <main className="flex-1 flex justify-center items-center w-full p-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-6">تسجيل الدخول</h1>
          
          {loading && <p className="text-center text-blue-500 mb-4">جاري تسجيل الدخول...</p>}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="phone" className="block text-gray-700 text-sm font-bold mb-2">رقم الهاتف:</label>
              <input
                type="text"
                id="phone"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline transition duration-200 ease-in-out focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div className="mb-6">
              <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">كلمة المرور:</label>
              <input
                type="password"
                id="password"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline transition duration-200 ease-in-out focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center justify-between mt-6">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
              </button>
              <Link href="#" className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800 transition duration-200 ease-in-out">
                نسيت كلمة المرور؟
              </Link>
            </div>
          </form>
          <p className="text-center text-gray-600 text-sm mt-6">
            ليس لديك حساب؟ <Link href="/auth/register" className="text-blue-500 hover:text-blue-800 font-bold transition duration-200 ease-in-out">سجل الآن</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
