// app/auth/login/page.tsx
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get('/api/user/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => {
        if (res.status === 200) router.replace('/');
      }).catch(err => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('userName');
      });
    }
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
        router.push('/');
      } else if (response.data.redirectToVerify && response.data.phone) {
        setError(response.data.message || 'حسابك غير مفعل. الرجاء توجيهك لصفحة التحقق.');
        router.push(`/auth/verify-otp?phone=${encodeURIComponent(response.data.phone)}`);
      } else {
        setError('خطأ غير معروف في تسجيل الدخول. الرجاء المحاولة مرة أخرى.');
      }
    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex flex-column bg-light">
      <main className="flex-grow-1 d-flex justify-content-center align-items-center w-100 p-4">
        <div className="bg-white p-4 p-md-5 rounded-3 shadow w-100" style={{ maxWidth: 400 }}>
          <h1 className="h4 fw-bold text-center mb-4">تسجيل الدخول</h1>
          {loading && <p className="text-center text-primary mb-3">جاري تسجيل الدخول...</p>}
          {error && (
            <div className="alert alert-danger py-2 text-center mb-3" role="alert">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="phone" className="form-label fw-semibold">رقم الهاتف</label>
              <input
                type="text"
                id="phone"
                className="form-control"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="01XXXXXXXXX"
                autoComplete="phone"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="password" className="form-label fw-semibold">كلمة المرور</label>
              <input
                type="password"
                id="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <button
                type="submit"
                className="btn btn-primary px-4"
                disabled={loading}
              >
                {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
              </button>
              <Link href="#" className="text-primary small text-decoration-none">
                نسيت كلمة المرور؟
              </Link>
            </div>
          </form>
          <div className="text-center mt-3">
            <span className="text-secondary small">ليس لديك حساب؟ </span>
            <Link href="/auth/register" className="text-primary fw-bold small text-decoration-none">
              سجل الآن
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}


