// app/group/[groupId]/edit/page.tsx
'use client';

import React, { useState, useEffect, FormEvent, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
// import Navbar from '@/components/Navbar';
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
  
  if (!params?.groupId) {
    return <div>معرف المجموعة غير صحيح</div>;
  }
  
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
        setError('حدث خطأ غير متوقع. الرجاء المحاولة لاحقٍ.');
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
        setError('حدث خطأ غير متوقع. الرجاء المحاولة لاحقٍ.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !isUserLoggedIn) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="min-vh-100 d-flex flex-column">
        <main className="flex-grow-1 py-5 container">
          <ErrorMessage message={error} />
          <button
            onClick={() => router.push('/')}
            className="btn btn-primary mt-4"
          >
            العودة إلى المجموعات
          </button>
        </main>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-vh-100 d-flex flex-column">
        <main className="flex-grow-1 py-5 container">
          <p className="text-center text-danger fs-5">المجموعة غير متوفرة أو حدث خطأ أثناء تحميلها.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light d-flex flex-column">
      <main className="flex-grow-1 container py-5">
        <div className="row justify-content-center">
          <div className="col-12 col-md-10 col-lg-8">
            <div className="card shadow-sm p-4">
              <h1 className="h3 fw-bold text-center mb-4 text-primary">تعديل المجموعة: {group.name}</h1>

              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}

              {saveSuccess && (
                <div className="alert alert-success" role="alert">
                  {saveSuccess}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="name" className="form-label fw-semibold">اسم المجموعة</label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="form-control"
                    disabled={isSaving}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="description" className="form-label fw-semibold">الوصف (اختياري)</label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="form-control"
                    disabled={isSaving}
                  ></textarea>
                </div>

                <div className="d-grid gap-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="btn btn-primary fw-bold"
                  >
                    {isSaving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/group/${groupId}`)}
                    className="btn btn-secondary fw-bold"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


