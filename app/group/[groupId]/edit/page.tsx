// app/group/[groupId]/edit/page.tsx
'use client';

import React, { useState, useEffect, FormEvent, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import axios from 'axios';
import DOMPurify from 'dompurify';

interface GroupDetails {
  id: string;
  name: string;
  description: string;
  coverImageUrl: string | null;
  adminId: string;
  isMember: boolean;
  isAdmin: boolean;
  canEdit: boolean;
}

export default function EditGroupPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);

  const fetchGroupDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsUserLoggedIn(false);
        router.push('/auth/login');
        return;
      }
      setIsUserLoggedIn(true);

      const response = await axios.get(`/api/groups/${groupId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        const fetchedGroup: GroupDetails = response.data.group;
        if (!fetchedGroup.canEdit) {
          setError('ليس لديك صلاحية لتعديل هذه المجموعة.');
          router.push('/');
          return;
        }
        setGroup(fetchedGroup);
        setName(DOMPurify.sanitize(fetchedGroup.name));
        setDescription(DOMPurify.sanitize(fetchedGroup.description || ''));
      } else {
        setError(response.data.error || 'فشل في جلب تفاصيل المجموعة.');
        router.push('/');
      }
    } catch (err: any) {
      console.error('Error fetching group details for edit:', err);
      if (axios.isAxiosError(err) && err.response) {
        if (err.response.status === 401 || err.response.status === 403) {
          setError('الرجاء تسجيل الدخول أو ليس لديك صلاحية.');
          setIsUserLoggedIn(false);
          router.push('/auth/login');
        } else if (err.response.status === 404) {
          setError('المجموعة غير موجودة.');
          router.push('/');
        } else {
          setError(err.response.data?.error || 'حدث خطأ أثناء جلب بيانات المجموعة.');
        }
      } else {
        setError('حدث خطأ غير متوقع. الرجاء المحاولة لاحقاً.');
      }
    } finally {
      setLoading(false);
    }
  }, [groupId, router]);

  useEffect(() => {
    if (groupId) {
      fetchGroupDetails();
    }
  }, [groupId, fetchGroupDetails]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    setError(null);

    const token = localStorage.getItem('token');
    if (!token) {
      setError('الرجاء تسجيل الدخول لحفظ التغييرات.');
      setIsSaving(false);
      router.push('/auth/login');
      return;
    }

    try {
      const sanitizedName = DOMPurify.sanitize(name.trim());
      const sanitizedDescription = DOMPurify.sanitize(description.trim());

      const response = await axios.put(`/api/groups/${groupId}`, {
        name: sanitizedName,
        description: sanitizedDescription,
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        setSaveSuccess('تم حفظ التغييرات بنجاح!');
        router.push(`/group/${groupId}`);
      } else {
        setError(response.data.error || 'فشل في حفظ التغييرات.');
      }
    } catch (err: any) {
      console.error('Error saving group:', err);
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data?.error || 'حدث خطأ أثناء حفظ التغييرات.');
        if (err.response.status === 401 || err.response.status === 403) {
          router.push('/auth/login');
        }
      } else {
        setError('حدث خطأ غير متوقع. الرجاء المحاولة لاحقاً.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !isUserLoggedIn) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 p-6 container mx-auto">
          <ErrorMessage message={error} />
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            العودة إلى المجموعات
          </button>
        </main>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 p-6 container mx-auto">
          <p className="text-center text-red-600 text-lg">المجموعة غير متوفرة أو حدث خطأ أثناء تحميلها.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 mt-16">
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-lg">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">تعديل المجموعة: {group.name}</h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative mb-6" role="alert">
              <span className="block sm:inline">{saveSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-lg font-medium text-gray-700 mb-2">اسم المجموعة</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-lg"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-lg font-medium text-gray-700 mb-2">الوصف (اختياري)</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-lg"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-md shadow-lg transition duration-300 focus:outline-none focus:ring-4 focus:ring-blue-300 text-xl disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSaving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/group/${groupId}`)}
              className="w-full mt-4 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-6 rounded-md shadow-lg transition duration-300 focus:outline-none focus:ring-4 focus:ring-gray-300 text-xl"
            >
              إلغاء
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
