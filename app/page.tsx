// app/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import axios from 'axios';
import { Dropdown } from 'react-bootstrap'; // تأكد من تثبيت react-bootstrap

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

export default function HomePage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [welcomeName, setWelcomeName] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [tabType, setTabType] = useState<'all' | 'joined' | 'myGroups'>('all');
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();

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
          setError('فشل في جلب المجموعات. الرجاء المحاولة لاحقاً.');
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
    const nameFromUrl = searchParams.get('welcomeName');
    if (nameFromUrl) {
      setWelcomeName(decodeURIComponent(nameFromUrl));
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete('welcomeName');
      const newUrl = `${window.location.pathname}${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ''}`;
      router.replace(newUrl);
    }
    fetchGroups();
  }, [searchParams, fetchGroups, router]);

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
    <div className="min-vh-100 bg-light d-flex flex-column" dir="rtl">
      <Navbar />

      <main className="flex-grow-1 container py-4">
        {welcomeName && (
          <div className="alert alert-primary text-center fw-bold mb-4">
            مرحباً بك يا {welcomeName}! يسعدنا انضمامك.
          </div>
        )}

        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
          <h1 className="fw-bold fs-2 mb-0">المجموعات</h1>
          <button
            onClick={handleCreateGroupClick}
            className="btn btn-primary fw-bold px-4 py-2 rounded-pill shadow-sm"
          >
            + إنشاء مجموعة جديدة
          </button>
        </div>

        <div className="mb-4 row g-2 align-items-center">
          <div className="col-12 col-md-6">
            <input
              type="text"
              placeholder="ابحث عن مجموعة..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="form-control rounded-pill"
            />
          </div>
          <div className="col-12 col-md-6">
            <ul className="nav nav-pills justify-content-end gap-2">
              <li className="nav-item">
                <button
                  className={`nav-link ${tabType === 'all' ? 'active' : ''}`}
                  onClick={() => handleTabChange('all')}
                >
                  جميع المجموعات
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${tabType === 'joined' ? 'active' : ''}`}
                  onClick={() => handleTabChange('joined')}
                >
                  مجموعاتي المنضمة
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${tabType === 'myGroups' ? 'active' : ''}`}
                  onClick={() => handleTabChange('myGroups')}
                >
                  مجموعاتي التي أديرها
                </button>
              </li>
            </ul>
          </div>
        </div>

        {loading ? (
          <div className="d-flex justify-content-center py-5">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <ErrorMessage message={error} />
        ) : groups.length === 0 ? (
          <p className="text-center text-muted py-5">
            {tabType === 'joined' && !isUserLoggedIn
              ? 'الرجاء تسجيل الدخول لعرض مجموعاتك المنضمة.'
              : tabType === 'myGroups' && !isUserLoggedIn
              ? 'الرجاء تسجيل الدخول لعرض المجموعات التي تديرها.'
              : tabType === 'joined' && isUserLoggedIn
              ? 'لم تنضم إلى أي مجموعات بعد. استكشف "جميع المجموعات" أو انشئ مجموعتك الخاصة!'
              : tabType === 'myGroups' && isUserLoggedIn
              ? 'لا تدير أي مجموعات حالياً. انشئ مجموعتك الخاصة!'
              : 'لا توجد مجموعات متاحة حالياً تطابق بحثك. كن أول من ينشئ مجموعة!'}
          </p>
        ) : (
          <>
            <div className="row g-4">
              {groups.map((group) => (
                <div key={group.id} className="col-12 col-sm-6 col-md-4 col-lg-3">
                  <div className="card h-100 shadow-sm position-relative">
                    {/* قائمة الخيارات (ثلاث نقاط) تظهر فقط للمالك أو الأدمن */}
                    {(group.canEdit || group.isAdmin) && (
                      <Dropdown className="position-absolute start-0 mt-2 ms-2" align="start">
                        <Dropdown.Toggle
                          variant="link"
                          bsPrefix="p-0 border-0 bg-transparent"
                          style={{ boxShadow: 'none', color: '#333', fontSize: '1.5rem' }}
                          id={`dropdown-group-${group.id}`}
                        >
                          <span style={{ fontSize: '1.5rem', lineHeight: '1' }}>⋮</span>
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Item onClick={() => handleEditGroup(group.id)}>
                            تعديل المجموعة
                          </Dropdown.Item>
                          <Dropdown.Item onClick={() => handleDeleteGroup(group.id, group.name)}>
                            حذف المجموعة
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    )}

                    <Link href={`/group/${group.id}`} className="text-decoration-none">
                      {group.coverImageUrl ? (
                        <img
                          src={group.coverImageUrl}
                          alt={group.name}
                          className="card-img-top"
                          style={{ height: 150, objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="card-img-top bg-secondary d-flex align-items-center justify-content-center text-white" style={{ height: 150 }}>
                          لا يوجد صورة غلاف
                        </div>
                      )}
                    </Link>
                    <div className="card-body">
                      <h5 className="card-title text-end">{group.name}</h5>
                      {group.description && (
                        <p className="card-text text-end text-muted small">
                          {group.description.substring(0, 70)}
                          {group.description.length > 70 ? '...' : ''}
                        </p>
                      )}
                      <p className="card-text text-end text-muted small">{group.memberCount} أعضاء</p>
                    </div>
                    <div className="card-footer bg-white border-0 d-flex flex-wrap gap-2 justify-content-end">
                      {group.isMember ? (
                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => handleJoinLeaveGroup(group.id, 'leave')}
                        >
                          مغادرة المجموعة
                        </button>
                      ) : (
                        <button
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => handleJoinLeaveGroup(group.id, 'join')}
                        >
                          انضمام
                        </button>
                      )}
                      <Link href={`/group/${group.id}`} className="btn btn-outline-secondary btn-sm">
                        عرض
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <nav className="d-flex justify-content-center mt-4">
                <ul className="pagination">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => handlePageChange(currentPage - 1)}>السابق</button>
                  </li>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                      <button className="page-link" onClick={() => handlePageChange(page)}>{page}</button>
                    </li>
                  ))}
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => handlePageChange(currentPage + 1)}>التالي</button>
                  </li>
                </ul>
              </nav>
            )}
          </>
        )}
      </main>
    </div>
  );
}
