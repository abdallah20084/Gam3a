// app/(auth)/verify-otp/page.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';

// 1. Define the Zod schema for OTP validation
const otpSchema = z.object({
  otp: z.string().length(6, 'كود التحقق يجب أن يتكون من 6 أرقام.'),
});

type OTPFormValues = z.infer<typeof otpSchema>;

export default function VerifyOtpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(60); // 60 seconds for resend cooldown

  const phone = searchParams.get('phone'); // Get phone number from URL query parameter

  const { register, handleSubmit, formState: { errors } } = useForm<OTPFormValues>({
    resolver: zodResolver(otpSchema),
  });

  // Timer for resend button
  useEffect(() => {
    let timerId: NodeJS.Timeout;
    if (resendTimer > 0 && !isResending) { // Only count down if not actively resending
      timerId = setTimeout(() => setResendTimer(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timerId);
  }, [resendTimer, isResending]);

  const onSubmit = async (data: OTPFormValues) => {
    if (!phone) {
      setError('رقم الهاتف غير موجود. يرجى العودة لصفحة التسجيل.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await axios.post('/api/auth/verify-otp', { phone, otp: data.otp });
      setSuccessMessage(response.data.message || 'تم التحقق بنجاح! جارٍ التوجيه...');
      // Redirect to home page or dashboard after successful verification
      router.push('/home'); // Or '/dashboard', '/profile'
    } catch (err: any) {
      console.error('OTP verification error:', err);
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('حدث خطأ أثناء التحقق من الكود. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!phone) {
      setError('رقم الهاتف غير موجود لإعادة الإرسال.');
      return;
    }
    if (resendTimer > 0) return; // Prevent resending before timer ends

    setIsResending(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await axios.post('/api/auth/resend-otp', { phone });
      setSuccessMessage(response.data.message || 'تم إعادة إرسال كود التحقق بنجاح.');
      setResendTimer(60); // Reset timer after resend
    } catch (err: any) {
      console.error('Resend OTP error:', err);
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('فشل إعادة إرسال الكود. يرجى المحاولة لاحقاً.');
      }
    } finally {
      setIsResending(false);
    }
  };

  // Format phone number for display (e.g., +2010****567)
  const displayPhone = phone ? `<span class="math-inline">\{phone\.substring\(0, 6\)\}\*\*\*\*</span>{phone.substring(phone.length - 3)}` : 'رقمك';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <header className="absolute top-0 left-0 right-0 p-4 bg-white shadow-sm flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-blue-600">Gam3a5G.com</Link>
        {/* No login/register buttons needed on this page usually, but you can add them if desired */}
      </header>

      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-lg mt-20">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">تحقق من رقم هاتفك</h1>
        <p className="text-center text-gray-600 mb-6">
          لقد أرسلنا كود تحقق إلى رقم واتساب <span className="font-semibold text-gray-800">{displayPhone}</span>.
          يرجى إدخال الكود أدناه.
        </p>

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
            <label htmlFor="otp" className="block text-gray-700 text-sm font-bold mb-2">
              كود التحقق (OTP)
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric" // Suggests numeric keyboard on mobile
              pattern="[0-9]*" // Allows only digits for pattern matching
              maxLength={6}
              {...register('otp')}
              className="shadow appearance-none border rounded w-full py-3 px-4 text-center text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500 text-2xl font-mono tracking-widest"
              placeholder="------"
            />
            {errors.otp && <p className="text-red-500 text-xs italic mt-1">{errors.otp.message}</p>}
          </div>

          <button
            type="submit"
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? 'جارٍ التحقق...' : 'تحقق'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={handleResendOtp}
            className={`text-blue-600 hover:underline transition duration-200 ${resendTimer > 0 || isResending ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={resendTimer > 0 || isResending}
          >
            {isResending ? 'جارٍ الإرسال...' : resendTimer > 0 ? `إعادة الإرسال بعد ${resendTimer} ثانية` : 'إعادة إرسال الكود'}
          </button>
          <p className="mt-4 text-gray-600">
            أدخلت رقمًا خاطئًا؟{' '}
            <Link href="/auth/register" className="text-blue-600 hover:underline">
              العودة إلى التسجيل
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}