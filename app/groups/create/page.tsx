// app/groups/create/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import LoadingSpinner from '@/components/LoadingSpinner';
import DOMPurify from 'dompurify';

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
      if (axios.isAxiosError(err) && err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('فشل في إنشاء المجموعة. الرجاء المحاولة مرة أخرى.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* حذف النافبار من هنا */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-xl border border-gray-200">
          <div className="container py-5">
            <div className="row justify-content-center">
              <div className="col-12 col-md-8 col-lg-6">
                <div className="card shadow-sm p-4">
                  <button
                    onClick={() => router.back()}
                    className="btn btn-link mb-3"
                  >
                    <i className="bi bi-arrow-right"></i> العودة
                  </button>
                  <h1 className="h3 fw-bold text-center mb-4 text-primary">
                    إنشاء مجموعة جديدة
                  </h1>
                  {error && (
                    <div className="alert alert-danger">{error}</div>
                  )}
                  {success && (
                    <div className="alert alert-success">{success}</div>
                  )}
                  <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                      <label htmlFor="name" className="form-label fw-semibold">اسم المجموعة</label>
                      <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="form-control"
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="description" className="form-label fw-semibold">وصف المجموعة</label>
                      <textarea
                        id="description"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="form-control"
                        rows={4}
                        required
                        disabled={loading}
                      ></textarea>
                    </div>
                    <div className="mb-3">
                      <label htmlFor="coverImageUrl" className="form-label fw-semibold">رابط صورة الغلاف (اختياري)</label>
                      <input
                        type="url"
                        id="coverImageUrl"
                        value={coverImageUrl}
                        onChange={e => setCoverImageUrl(e.target.value)}
                        className="form-control"
                        disabled={loading}
                      />
                    </div>
                    <div className="d-grid">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                      >
                        {loading ? <LoadingSpinner size="sm" /> : 'إنشاء المجموعة'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


