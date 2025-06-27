// app/group/[groupId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import GroupChat from '@/components/features/GroupChat';
import LoadingSpinner from '@/components/LoadingSpinner';
import { getValidToken } from '@/lib/auth';
import { FaUsers, FaLock, FaSignInAlt, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';

interface GroupData {
  _id: string;
  name: string;
  description?: string;
  admin: string;
  members: any[];
  memberCount: number;
  coverImageUrl?: string;
}

interface UserData {
  _id: string;
  name: string;
  avatar?: string;
}

export default function GroupPage() {
  const params = useParams();
  const router = useRouter();
  
  if (!params?.groupId) {
    return <div>معرف المجموعة غير صحيح</div>;
  }
  
  const groupId = params.groupId as string;
  
  // State variables
  const [loading, setLoading] = useState(true);
  const [joiningGroup, setJoiningGroup] = useState(false);
  const [group, setGroup] = useState<GroupData | null>(null);
  const [members, setMembers] = useState<UserData[]>([]);
  const [userId, setUserId] = useState('');
  const [initialMessages, setInitialMessages] = useState([]);
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);

  // Fetch group data and check membership
  const fetchGroupData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getValidToken();
      if (!token) {
        setAuthError(true);
        setLoading(false);
        return;
      }

      console.log('🔍 Fetching group data for:', groupId);
      
      // Fetch group details
      const response = await axios.get(`/api/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        const groupData = response.data.group;
        const currentUserId = response.data.currentUserId;
        
        console.log('✅ Group data fetched:', {
          groupName: groupData.name,
          memberCount: groupData.members?.length || 0,
          currentUserId,
          isAdmin: groupData.admin === currentUserId
        });
        
        setGroup(groupData);
        setMembers(groupData.members || []);
        setUserId(currentUserId);
        setIsAdmin(groupData.admin === currentUserId);
        
        // Check if user is a member
        const userIsMember = groupData.members?.some((member: any) => 
          member._id === currentUserId || member.id === currentUserId
        );
        setIsMember(userIsMember);
        if (userIsMember) setJoinSuccess(false);
        
        // If user is member, fetch messages
        if (userIsMember) {
          await fetchMessages(token);
        } else {
          console.log('🔒 User is not a member of this group');
          setInitialMessages([]);
        }
      }
      
    } catch (error: any) {
      console.error('❌ Error fetching group data:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          setAuthError(true);
        } else if (error.response?.status === 403) {
          setError('غير مصرح لك بالوصول إلى هذه المجموعة. يرجى الانضمام أولاً.');
          setIsMember(false);
        } else if (error.response?.status === 404) {
          setError('المجموعة غير موجودة.');
        } else {
          setError('حدث خطأ أثناء تحميل بيانات المجموعة.');
        }
      } else {
        setError('حدث خطأ غير متوقع.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for group
  const fetchMessages = async (token: string) => {
    try {
      console.log('📨 Fetching messages for group:', groupId);
      const messagesResponse = await axios.get(`/api/groups/${groupId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (messagesResponse.data.success) {
        const messages = messagesResponse.data.messages || [];
        console.log('✅ Fetched messages:', messages.length);
        setInitialMessages(messages.reverse());
      }
    } catch (messageError: any) {
      console.error('❌ Error fetching messages:', messageError);
      
      if (messageError.response?.status === 403) {
        console.log('🔒 User not member - cannot fetch messages');
        setInitialMessages([]);
      } else if (messageError.response?.status === 401) {
        setAuthError(true);
      } else {
        // Continue with empty messages
        setInitialMessages([]);
      }
    }
  };

  // Join group function
  const handleJoinGroup = async () => {
    try {
      setJoiningGroup(true);
      setError(null);
      
      const token = getValidToken();
      if (!token) {
        setAuthError(true);
        return;
      }

      console.log('🤝 Joining group:', groupId);
      
      const response = await axios.post(`/api/groups/${groupId}/members`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.status === 201 || response.status === 200) {
        console.log('✅ Successfully joined group');
        setJoinSuccess(true);
        setIsMember(true);
        
        // Refresh group data to get updated member list
        setTimeout(() => {
          fetchGroupData();
        }, 1000);
        
      }
      
    } catch (error: any) {
      console.error('❌ Error joining group:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 409) {
          setError('أنت بالفعل عضو في هذه المجموعة.');
          setIsMember(true);
        } else if (error.response?.status === 401) {
          setAuthError(true);
        } else if (error.response?.status === 404) {
          setError('المجموعة غير موجودة.');
        } else {
          setError('فشل الانضمام إلى المجموعة. يرجى المحاولة مرة أخرى.');
        }
      } else {
        setError('حدث خطأ غير متوقع أثناء الانضمام للمجموعة.');
      }
    } finally {
      setJoiningGroup(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (groupId) {
      fetchGroupData();
    }
  }, [groupId]);

  // Loading state
  if (loading) {
    return (
      <div className="container-fluid d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-3 text-muted">جاري تحميل بيانات المجموعة...</p>
        </div>
      </div>
    );
  }

  // Authentication error
  if (authError) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card shadow-sm border-0">
              <div className="card-body text-center p-5">
                <div className="mb-4">
                  <FaLock size={48} className="text-warning mb-3" />
                  <h4 className="fw-bold">يجب تسجيل الدخول</h4>
                  <p className="text-muted">يجب عليك تسجيل الدخول لعرض هذه المجموعة</p>
                </div>
                <button 
                  onClick={() => router.push('/auth/login')} 
                  className="btn btn-primary btn-lg px-4"
                >
                  <FaSignInAlt className="me-2" />
                  تسجيل الدخول
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !group) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card shadow-sm border-0">
              <div className="card-body text-center p-5">
                <div className="mb-4">
                  <FaExclamationTriangle size={48} className="text-danger mb-3" />
                  <h4 className="fw-bold">خطأ في تحميل المجموعة</h4>
                  <p className="text-muted">{error}</p>
                </div>
                <button 
                  onClick={() => router.push('/groups')} 
                  className="btn btn-outline-primary"
                >
                  العودة إلى المجموعات
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Group not found
  if (!group) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card shadow-sm border-0">
              <div className="card-body text-center p-5">
                <div className="mb-4">
                  <FaExclamationTriangle size={48} className="text-warning mb-3" />
                  <h4 className="fw-bold">المجموعة غير موجودة</h4>
                  <p className="text-muted">لم يتم العثور على المجموعة المطلوبة</p>
                </div>
                <button 
                  onClick={() => router.push('/groups')} 
                  className="btn btn-primary"
                >
                  العودة إلى المجموعات
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // User is not a member - show join prompt
  if (!isMember && !joinSuccess) {
    return (
      <div className="container-fluid p-0">
        <div className="row g-0">
          {/* Group Info Header */}
          <div className="col-12 bg-white border-bottom">
            <div className="p-4">
              <div className="d-flex align-items-center">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold me-3"
                  style={{
                    width: 60,
                    height: 60,
                    background: 'linear-gradient(135deg, #3b82f6, #1e40af)'
                  }}
                >
                  {group.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-grow-1">
                  <h3 className="fw-bold mb-1">{group.name}</h3>
                  <p className="text-muted mb-2">
                    {group.description || 'لا يوجد وصف للمجموعة'}
                  </p>
                  <div className="d-flex align-items-center text-muted">
                    <FaUsers className="me-2" />
                    <span>{group.memberCount || members.length} عضو</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Join Prompt */}
          <div className="col-12">
            <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
              <div className="text-center p-5">
                <div className="mb-4">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold mx-auto mb-3"
                    style={{
                      width: 80,
                      height: 80,
                      background: 'linear-gradient(135deg, #10b981, #059669)'
                    }}
                  >
                    <FaUsers size={32} />
                  </div>
                  <h4 className="fw-bold mb-3">انضم إلى {group.name}</h4>
                  <p className="text-muted mb-4">
                    للوصول إلى محتوى هذه المجموعة والدردشة مع الأعضاء، 
                    يجب عليك الانضمام أولاً.
                  </p>
                </div>
                
                <button 
                  onClick={handleJoinGroup}
                  disabled={joiningGroup}
                  className="btn btn-success btn-lg px-5 py-3"
                >
                  {joiningGroup ? (
                    <>
                      <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                      جاري الانضمام...
                    </>
                  ) : (
                    <>
                      <FaSignInAlt className="me-2" />
                      انضم إلى المجموعة
                    </>
                  )}
                </button>
                
                {error && (
                  <div className="alert alert-danger mt-3" role="alert">
                    {error}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Join success message
  if (joinSuccess) {
    return (
      <div className="container-fluid p-0">
        <div className="row g-0">
          <div className="col-12">
            <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
              <div className="text-center p-5">
                <div className="mb-4">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold mx-auto mb-3"
                    style={{
                      width: 80,
                      height: 80,
                      background: 'linear-gradient(135deg, #10b981, #059669)'
                    }}
                  >
                    <FaCheckCircle size={32} />
                  </div>
                  <h4 className="fw-bold mb-3 text-success">تم الانضمام بنجاح!</h4>
                  <p className="text-muted mb-4">
                    مرحباً بك في {group.name}. جاري تحميل الدردشة...
                  </p>
                </div>
                <LoadingSpinner />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // User is a member - show chat
  return (
    <div className="container-fluid p-0">
      <GroupChat
        groupId={groupId}
        userId={userId}
        members={members}
        initialMessages={initialMessages}
        groupName={group.name}
        isAdmin={isAdmin}
      />
    </div>
  );
}







