// app/auth/register/page.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const formSchema = z.object({
  name: z.string().min(3, 'الاسم يجب أن يتكون من 3 أحرف على الأقل.'),
  phone: z.string().regex(/^0[0-9]{10}$/, 'رقم هاتف غير صالح. يجب أن يبدأ بـ 0 ويتكون من 11 رقمًا (مثال: 01XXXXXXXXX).'),
  password: z.string().min(6, 'كلمة المرور يجب أن تتكون من 6 أحرف على الأقل.'),
  confirmPassword: z.string().min(6, 'تأكيد كلمة المرور يجب أن يتكون من 6 أحرف على الأقل.'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'كلمتا المرور غير متطابقتين!',
  path: ['confirmPassword'],
});

type RegisterFormValues = z.infer<typeof formSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(formSchema),
  });

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
            router.replace('/');
          } else {
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
            localStorage.removeItem('userName');
            localStorage.removeItem('isSuperAdmin');
          }
        } catch (err: any) {
          localStorage.removeItem('token');
          localStorage.removeItem('userId');
          localStorage.removeItem('userName');
          localStorage.removeItem('isSuperAdmin');
        }
      }
    };

    checkAuthStatus();
  }, [router]);

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    let formattedPhone = data.phone;
    if (formattedPhone.startsWith('0')) {
      formattedPhone = formattedPhone.substring(1);
    }
    formattedPhone = '+2' + formattedPhone; 

    try {
      const response = await axios.post('/api/auth/register', {
        name: data.name,
        phone: formattedPhone,
        password: data.password,
      });

      if (response.status === 201) {
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('userName', response.data.userName);
          localStorage.setItem('userId', response.data.userId);
          localStorage.setItem('isSuperAdmin', response.data.isSuperAdmin ? 'true' : 'false');
        }

        setSuccessMessage(response.data.message || 'تم التسجيل بنجاح! جارٍ التوجيه...');
        router.push(`/?welcomeName=${encodeURIComponent(data.name)}`);
        router.refresh();
      }
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('حدث خطأ أثناء التسجيل. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex flex-column bg-light">
      <main className="flex-grow-1 d-flex justify-content-center align-items-center w-100 p-4">
        <div className="bg-white p-4 p-md-5 rounded-3 shadow w-100" style={{ maxWidth: 400 }}>
          <h1 className="h4 fw-bold text-center mb-4">إنشاء حساب جديد</h1>

          {isLoading && <p className="text-center text-primary mb-3">جاري التحميل...</p>}

          {error && (
            <div className="alert alert-danger py-2 text-center mb-3" role="alert">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="alert alert-success py-2 text-center mb-3" role="alert">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-3">
              <label htmlFor="name" className="form-label fw-semibold">الاسم بالكامل</label>
              <input
                id="name"
                type="text"
                {...register('name')}
                className={`form-control${errors.name ? ' is-invalid' : ''}`}
                placeholder="الاسم بالكامل"
                autoComplete="name"
              />
              {errors.name && <div className="invalid-feedback">{errors.name.message}</div>}
            </div>

            <div className="mb-3">
              <label htmlFor="phone" className="form-label fw-semibold">رقم واتساب</label>
              <input
                id="phone"
                type="tel"
                {...register('phone')}
                className={`form-control${errors.phone ? ' is-invalid' : ''}`}
                placeholder="01XXXXXXXXX"
                autoComplete="username"
              />
              {errors.phone && <div className="invalid-feedback">{errors.phone.message}</div>}
            </div>

            <div className="mb-3">
              <label htmlFor="password" className="form-label fw-semibold">كلمة السر</label>
              <input
                id="password"
                type="password"
                {...register('password')}
                className={`form-control${errors.password ? ' is-invalid' : ''}`}
                placeholder="********"
                autoComplete="new-password"
              />
              {errors.password && <div className="invalid-feedback">{errors.password.message}</div>}
            </div>

            <div className="mb-4">
              <label htmlFor="confirmPassword" className="form-label fw-semibold">تأكيد كلمة السر</label>
              <input
                id="confirmPassword"
                type="password"
                {...register('confirmPassword')}
                className={`form-control${errors.confirmPassword ? ' is-invalid' : ''}`}
                placeholder="********"
                autoComplete="new-password"
              />
              {errors.confirmPassword && <div className="invalid-feedback">{errors.confirmPassword.message}</div>}
            </div>

            <button
              type="submit"
              className={`btn btn-primary w-100${isLoading ? ' disabled' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? 'جارٍ التسجيل...' : 'تسجيل حساب جديد'}
            </button>
          </form>

          <div className="text-center mt-3">
            <span className="text-secondary small">بالفعل لديك حساب؟ </span>
            <Link href="/auth/login" className="text-primary fw-bold small text-decoration-none">
              تسجيل الدخول
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

