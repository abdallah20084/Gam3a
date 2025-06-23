// app/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import axios from 'axios';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button'; 

interface Group {
  id: string;
  name: string;
  description: string;
  coverImageUrl: string | null;
  adminId: string;
  memberCount: number;
  isMember: boolean; 
  isAdmin: boolean;  
  canEdit: boolean; // This property controls the visibility of the edit and delete buttons
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

  // New function for handling group deletion
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
        fetchGroups(); // Re-fetch groups to update the list
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
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar />

      <main className="flex-1 p-6 container mx-auto">
        {welcomeName && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-lg relative mb-6 text-center">
            <span className="block text-xl font-semibold">مرحباً بك يا {welcomeName}! يسعدنا انضمامك.</span>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-extrabold text-gray-900">المجموعات</h1>
          <button
            onClick={handleCreateGroupClick}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full shadow-lg transition duration-300 focus:outline-none focus:ring-4 focus:ring-blue-300 text-lg"
          >
            + إنشاء مجموعة جديدة
          </button>
        </div>

        <div className="mb-6 flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-4 rtl:space-x-reverse">
          <input
            type="text"
            placeholder="ابحث عن مجموعة..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full md:w-auto flex-1 md:flex-none py-2 px-4 border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
          />
          
          <div className="flex justify-center space-x-4 rtl:space-x-reverse w-full md:w-auto flex-wrap gap-2">
            <button
              onClick={() => handleTabChange('all')}
              className={`py-2 px-6 rounded-full font-semibold transition-colors duration-200 ${
                tabType === 'all' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              جميع المجموعات
            </button>
            <button
              onClick={() => handleTabChange('joined')}
              className={`py-2 px-6 rounded-full font-semibold transition-colors duration-200 ${
                tabType === 'joined' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              مجموعاتي المنضمة
            </button>
            <button
              onClick={() => handleTabChange('myGroups')}
              className={`py-2 px-6 rounded-full font-semibold transition-colors duration-200 ${
                tabType === 'myGroups' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              مجموعاتي التي أديرها
            </button>
          </div>
        </div>


        {loading ? (
          <div className="flex justify-center items-center py-10">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <ErrorMessage message={error} />
        ) : groups.length === 0 ? (
          <p className="text-lg text-gray-600 text-center py-10">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {groups.map((group) => (
                <div key={group.id} className="bg-white rounded-lg shadow-md overflow-hidden relative group transform hover:scale-105 transition-transform duration-300">
                  {isUserLoggedIn && (
                    <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full bg-white/70 hover:bg-white text-gray-600 hover:text-gray-800 shadow">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-1 flex flex-col space-y-1">
                          {group.isMember ? (
                            <Button
                              variant="ghost"
                              className="w-full justify-start text-sm text-red-500 hover:text-red-600"
                              onClick={() => handleJoinLeaveGroup(group.id, 'leave')}
                            >
                              مغادرة المجموعة
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              className="w-full justify-start text-sm text-blue-500 hover:text-blue-600"
                              onClick={() => handleJoinLeaveGroup(group.id, 'join')}
                            >
                              الانضمام للمجموعة
                            </Button>
                          )}
                          {group.canEdit && (
                            <Button
                              variant="ghost"
                              className="w-full justify-start text-sm text-green-500 hover:text-green-600"
                              onClick={() => handleEditGroup(group.id)}
                            >
                              تعديل المجموعة
                            </Button>
                          )}
                          {/* New Delete Button */}
                          {group.canEdit && ( // Only show delete if user can edit (admin or super admin)
                            <Button
                              variant="ghost"
                              className="w-full justify-start text-sm text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteGroup(group.id, group.name)}
                            >
                              حذف المجموعة
                            </Button>
                          )}
                          <Link href={`/group/${group.id}`} passHref>
                            <Button variant="ghost" className="w-full justify-start text-sm text-gray-700 hover:text-gray-900">
                              عرض المجموعة
                            </Button>
                          </Link>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                  <Link href={`/group/${group.id}`} passHref>
                    <div className="block"> 
                      {group.coverImageUrl ? (
                        <img
                          src={group.coverImageUrl}
                          alt={group.name}
                          className="w-full h-36 object-cover"
                        />
                      ) : (
                        <div className="w-full h-36 bg-gray-300 flex items-center justify-center text-gray-600">
                          لا يوجد صورة غلاف [Image of a blank grey box]
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">{group.name}</h3>
                        {group.description && <p className="text-gray-600 text-sm">{group.description.substring(0, 70)}{group.description.length > 70 ? '...' : ''}</p>}
                        <p className="text-gray-600 text-sm mt-2">{group.memberCount} أعضاء</p>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center mt-8 space-x-2 rtl:space-x-reverse">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  السابق
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-4 py-2 rounded-lg font-semibold ${
                      currentPage === page ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || loading}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  التالي
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
