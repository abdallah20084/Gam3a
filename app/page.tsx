// app/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import axios from 'axios';
import { Dropdown } from 'react-bootstrap';

interface Group {
  id: string;
  name: string;
  description: string;
  coverImageUrl: string | null;
  adminId: string;
  memberCount: number;
  isMember: boolean;
  isAdmin: boolean;
  canEdit: boolean;
}

const GROUPS_PER_PAGE = 10;

export default function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = use(searchParams);
  const router = useRouter();
  
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [welcomeName, setWelcomeName] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [tabType, setTabType] = useState<'all' | 'joined' | 'myGroups'>('all');
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);

  const fetchGroups = useCallback(async () => {
    const token = localStorage.getItem('token');
    setLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.get(`/api/groups?page=${currentPage}&limit=${GROUPS_PER_PAGE}&tabType=${tabType}&search=${searchTerm}`, { headers });

      setGroups(response.data.groups);
      setTotalPages(response.data.totalPages);
      setIsUserLoggedIn(response.data.isLoggedIn || !!token);

      if (response.data.redirectToLogin) {
        router.push('/auth/login');
        return;
      }
    } catch (err: any) {
      console.error('Error fetching groups:', err);
      if (axios.isAxiosError(err) && err.response) {
        if (err.response.status === 401 || err.response.status === 403) {
          setError('الرجاء تسجيل الدخول لعرض هذه المجموعات أو لا توجد صلاحية.');
          localStorage.removeItem('token');
          localStorage.removeItem('userId');
          localStorage.removeItem('userName');
          localStorage.removeItem('isSuperAdmin');
          setIsUserLoggedIn(false);
          router.push('/auth/login');
        } else if (err.response.data && err.response.data.error) {
          setError(err.response.data.error);
        } else {
          setError('فشل في جلب المجموعات. الرجاء المحاولة لاحق<|im_start|>.');
        }
      } else {
        setError('حدث خطأ غير متوقع أثناء جلب المجموعات.');
      }
      setIsUserLoggedIn(false);
    } finally {
      setLoading(false);
    }
  }, [currentPage, tabType, searchTerm, router]);

  useEffect(() => {
    const nameFromUrl = params.welcomeName;
    if (nameFromUrl) {
      setWelcomeName(typeof nameFromUrl === 'string' ? decodeURIComponent(nameFromUrl) : null);
      // لا نحتاج لتعديل الـ URL هنا لأن Next.js 15 يتعامل مع searchParams بشكل مختلف
    }
    fetchGroups();
  }, [params, fetchGroups]);

  const handleCreateGroupClick = () => {
    if (!isUserLoggedIn) {
      alert('الرجاء تسجيل الدخول لإنشاء مجموعة جديدة.');
      router.push('/auth/login');
    } else {
      router.push('/groups/create');
    }
  };

  const handleTabChange = (newTab: typeof tabType) => {
    if ((newTab === 'joined' || newTab === 'myGroups') && !isUserLoggedIn) {
      alert('الرجاء تسجيل الدخول لعرض مجموعاتك الخاصة أو المجموعات التي تديرها.');
      router.push('/auth/login');
      return;
    }
    setTabType(newTab);
    setCurrentPage(1);
    setSearchTerm('');
  };

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleJoinLeaveGroup = async (groupId: string, action: 'join' | 'leave') => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('الرجاء تسجيل الدخول لإجراء هذه العملية.');
      router.push('/auth/login');
      return;
    }

    try {
      if (action === 'join') {
        const response = await axios.post(`/api/groups/${groupId}/members`, {}, { headers: { Authorization: `Bearer ${token}` } });
        alert(response.data.message || 'تم الانضمام إلى المجموعة بنجاح!');
      } else {
        const response = await axios.delete(`/api/groups/${groupId}/members`, { headers: { Authorization: `Bearer ${token}` } });
        alert(response.data.message || 'تم مغادرة المجموعة بنجاح!');
      }
      fetchGroups();
    } catch (err: any) {
      console.error(`Error ${action}ing group:`, err);
      alert(`حدث خطأ أثناء ${action === 'join' ? 'الانضمام' : 'المغادرة'}: ${axios.isAxiosError(err) && err.response?.data?.error || err.message}`);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        router.push('/auth/login');
      }
    }
  };

  const handleEditGroup = (groupId: string) => {
    router.push(`/group/${groupId}/edit`);
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    const confirmDelete = window.confirm(`هل أنت متأكد أنك تريد حذف المجموعة "${groupName}"؟ هذا الإجراء لا يمكن التراجع عنه.`);
    if (!confirmDelete) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('الرجاء تسجيل الدخول لحذف المجموعة.');
      router.push('/auth/login');
      return;
    }

    try {
      const response = await axios.delete(`/api/groups/${groupId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 200) {
        alert(response.data.message || 'تم حذف المجموعة بنجاح!');
        fetchGroups();
      } else {
        alert(response.data.error || 'فشل في حذف المجموعة. الرجاء المحاولة مرة أخرى.');
      }
    } catch (err: any) {
      console.error('Error deleting group:', err);
      alert(`حدث خطأ أثناء حذف المجموعة: ${axios.isAxiosError(err) && err.response?.data?.error || err.message}`);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        router.push('/auth/login');
      }
    }
  };

  return (
    <div className="min-vh-100 bg-light">
      <div className="container py-4">
        {/* عنوان الصفحة */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="fs-2 fw-bold">المجموعات</h1>
          <button 
            className="btn btn-primary rounded-pill d-flex align-items-center gap-1"
            onClick={handleCreateGroupClick}
          >
            <i className="bi bi-plus-circle"></i>
            <span>إنشاء مجموعة جديدة</span>
          </button>
        </div>

        {/* شريط البحث */}
        <div className="mb-4">
          <div className="input-group">
            <input
              type="text"
              className="form-control border-end-0 rounded-pill rounded-end"
              placeholder="ابحث عن مجموعة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchGroups()}
            />
            <button 
              className="btn btn-outline-secondary border-start-0 rounded-pill rounded-start" 
              type="button"
              onClick={fetchGroups}
            >
              <i className="bi bi-search"></i>
            </button>
          </div>
        </div>

        {/* علامات التبويب */}
        <div className="mb-4">
          <div className="d-flex gap-2">
            <button
              className={`btn ${tabType === 'all' ? 'btn-primary' : 'btn-outline-secondary'} rounded-pill`}
              onClick={() => setTabType('all')}
            >
              جميع المجموعات
            </button>
            <button
              className={`btn ${tabType === 'joined' ? 'btn-primary' : 'btn-outline-secondary'} rounded-pill`}
              onClick={() => setTabType('joined')}
            >
              مجموعاتي المنضمة
            </button>
            <button
              className={`btn ${tabType === 'myGroups' ? 'btn-primary' : 'btn-outline-secondary'} rounded-pill`}
              onClick={() => setTabType('myGroups')}
            >
              مجموعاتي التي أديرها
            </button>
          </div>
        </div>

        {/* قائمة المجموعات */}
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : groups.length === 0 ? (
          <div className="alert alert-info">لا توجد مجموعات متاحة حاليًا</div>
        ) : (
          <div className="row g-4">
            {groups.map((group) => (
              <div key={group.id} className="col-12 col-md-6 col-lg-3">
                <div className="card h-100 shadow-sm border-0 position-relative">
                  {/* زر القائمة المنسدلة */}
                  {group.isAdmin && (
                    <div className="position-absolute top-0 end-0 m-2">
                      <div className="dropdown">
                        <button 
                          className="btn btn-light btn-sm rounded-circle" 
                          type="button" 
                          data-bs-toggle="dropdown"
                        >
                          <i className="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end">
                          <li>
                            <button 
                              className="dropdown-item" 
                              onClick={() => handleEditGroup(group.id)}
                            >
                              <i className="bi bi-pencil me-2"></i>
                              تعديل المجموعة
                            </button>
                          </li>
                          <li>
                            <button 
                              className="dropdown-item text-danger" 
                              onClick={() => handleDeleteGroup(group.id, group.name)}
                            >
                              <i className="bi bi-trash me-2"></i>
                              حذف المجموعة
                            </button>
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                  
                  {/* صورة الغلاف */}
                  <div 
                    className="bg-secondary" 
                    style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {group.coverImageUrl ? (
                      <img
                        src={group.coverImageUrl}
                        alt={group.name}
                        className="card-img-top"
                        style={{ height: '150px', objectFit: 'cover' }}
                      />
                    ) : (
                      <span className="text-white">لا يوجد صورة غلاف</span>
                    )}
                  </div>
                  
                  {/* محتوى البطاقة */}
                  <div className="card-body">
                    <h5 className="card-title fw-bold mb-1">{group.name}</h5>
                    <p className="card-text text-muted small mb-3">
                      {group.memberCount || 0} أعضاء
                    </p>
                    
                    {/* أزرار التفاعل */}
                    <div className="d-flex gap-2">
                      <button 
                        className="btn btn-outline-danger flex-grow-1"
                        onClick={() => handleJoinLeaveGroup(group.id, group.isMember ? 'leave' : 'join')}
                        disabled={group.isMember}
                      >
                        {group.isMember ? 'مغادرة المجموعة' : 'مشاركة المجموعة'}
                      </button>
                      <button 
                        className="btn btn-outline-secondary flex-grow-1"
                        onClick={() => router.push(`/group/${group.id}`)}
                      >
                        عرض
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* التنقل بين الصفحات */}
        {totalPages > 1 && (
          <nav className="mt-4">
            <ul className="pagination justify-content-center">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button 
                  className="page-link" 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                >
                  السابق
                </button>
              </li>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <li 
                  key={page} 
                  className={`page-item ${currentPage === page ? 'active' : ''}`}
                >
                  <button 
                    className="page-link" 
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                </li>
              ))}
              
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button 
                  className="page-link" 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                >
                  التالي
                </button>
              </li>
            </ul>
          </nav>
        )}
      </div>
    </div>
  );
}


