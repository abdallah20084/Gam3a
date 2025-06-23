'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('كلمة السر غير متطابقة');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        router.push('/auth/login');
      } else {
        const data = await res.json();
        setError(data.error || 'فشل التسجيل');
      }
    } catch {
      setError('حدث خطأ أثناء التسجيل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow-sm mx-auto" style={{maxWidth: 400}}>
      <h2 className="mb-4 text-center fw-bold">تسجيل حساب جديد</h2>
      {error && <div className="alert alert-danger py-2 text-center mb-3">{error}</div>}
      <div className="mb-3">
        <label className="form-label">الاسم</label>
        <input
          type="text"
          className="form-control"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          required
        />
      </div>
      <div className="mb-3">
        <label className="form-label">رقم واتساب</label>
        <input
          type="tel"
          className="form-control"
          value={formData.phone}
          onChange={(e) => setFormData({...formData, phone: e.target.value})}
          required
        />
      </div>
      <div className="mb-3">
        <label className="form-label">كلمة السر</label>
        <input
          type="password"
          className="form-control"
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          required
        />
      </div>
      <div className="mb-4">
        <label className="form-label">تأكيد كلمة السر</label>
        <input
          type="password"
          className="form-control"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
          required
        />
      </div>
      <button type="submit" className="btn btn-primary w-100" disabled={loading}>
        {loading ? 'جاري التسجيل...' : 'تسجيل'}
      </button>
    </form>
  );
}