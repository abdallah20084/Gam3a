// app/auth/register/page.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

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
          console.error('Failed to verify token on register page:', err);
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
      console.error('Registration failed:', err);
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <Navbar />

      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-lg mt-20">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">إنشاء حساب جديد</h1>

        {isLoading && <p className="text-center text-blue-500 mb-4">جاري التحميل...</p>}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">
              الاسم بالكامل
            </label>
            <input
              id="name"
              type="text"
              {...register('name')}
              className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
              placeholder="الاسم بالكامل"
            />
            {errors.name && <p className="text-red-500 text-xs italic mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="phone" className="block text-gray-700 text-sm font-bold mb-2">
              رقم واتساب
            </label>
            <input
              id="phone"
              type="tel"
              {...register('phone')}
              className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
              placeholder="01XXXXXXXXX"
            />
            {errors.phone && <p className="text-red-500 text-xs italic mt-1">{errors.phone.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
              كلمة السر
            </label>
            <input
              id="password"
              type="password"
              {...register('password')}
              className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
              placeholder="********"
            />
            {errors.password && <p className="text-red-500 text-xs italic mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-gray-700 text-sm font-bold mb-2">
              تأكيد كلمة السر
            </label>
            <input
              id="confirmPassword"
              type="password"
              {...register('confirmPassword')}
              className="shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
              placeholder="********"
            />
            {errors.confirmPassword && <p className="text-red-500 text-xs italic mt-1">{errors.confirmPassword.message}</p>}
          </div>

          <button
            type="submit"
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? 'جارٍ التسجيل...' : 'تسجيل حساب جديد'}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-600">
          بالفعل لديك حساب؟{' '}
          <Link href="/auth/login" className="text-blue-600 hover:underline">
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
