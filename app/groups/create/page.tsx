// app/groups/create/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import LoadingSpinner from '@/components/LoadingSpinner';
import Head from 'next/head';
import { ArrowLeftIcon } from '@heroicons/react/24/outline'; 
import DOMPurify from 'dompurify'; // <--- استيراد DOMPurify

export default function CreateGroupPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false); 

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login?redirect=/groups/create');
    } else {
      setIsUserLoggedIn(true);
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const token = localStorage.getItem('token');
    if (!token) {
      setError('الرجاء تسجيل الدخول لإنشاء مجموعة.');
      setLoading(false);
      router.push('/auth/login?redirect=/groups/create');
      return;
    }

    try {
      // <--- FIX: Sanitize name and description before sending to API
      const sanitizedName = DOMPurify.sanitize(name.trim());
      const sanitizedDescription = DOMPurify.sanitize(description.trim());

      const response = await axios.post('/api/groups', {
        name: sanitizedName,
        description: sanitizedDescription,
        coverImageUrl: coverImageUrl || undefined,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 201) {
        setSuccess('تم إنشاء المجموعة بنجاح!');
        setName('');
        setDescription('');
        setCoverImageUrl('');
        router.push(`/group/${response.data.group._id}`);
      }
    } catch (err: any) {
      console.error('Error creating group:', err);
      if (axios.isAxiosError(err) && err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('فشل في إنشاء المجموعة. الرجاء المحاولة مرة أخرى.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isUserLoggedIn) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <Head>
        <title>إنشاء مجموعة جديدة - تطبيق الدردشة الجماعية</title>
        <meta name="description" content="أنشئ مجموعة دردشة جديدة بسهولة وادعُ أصدقاءك." />
      </Head>

      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => router.back()}
            className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4 flex items-center transition-colors duration-200"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            العودة
          </button>
          <h1 className="text-3xl font-extrabold text-center mb-6 text-indigo-700 dark:text-indigo-400">
            إنشاء مجموعة جديدة
          </h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 dark:bg-red-900 dark:text-red-300" role="alert">
              <strong className="font-bold">خطأ!</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          )}
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4 dark:bg-green-900 dark:text-green-300" role="alert">
              <strong className="font-bold">نجاح!</strong>
              <span className="block sm:inline"> {success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                اسم المجموعة
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                وصف المجموعة
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm resize-y"
                required
                disabled={loading}
              ></textarea>
            </div>

            <div>
              <label htmlFor="coverImageUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                رابط صورة الغلاف (اختياري)
              </label>
              <input
                type="url"
                id="coverImageUrl"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="مثال: https://example.com/image.jpg"
                disabled={loading}
              />
            </div>

            <div>
              <button
                type="submit"
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-300 ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
                disabled={loading}
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white mr-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  'إنشاء المجموعة'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
