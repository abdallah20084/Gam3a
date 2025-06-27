// app/groups/[groupId]/page.tsx 
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

  useEffect(() => {
    if (groupId && groupId !== 'undefined') {
      fetchGroupData();
    }
  }, [groupId]);

  if (loading) {
    return (
      <div className="container py-5">
        <LoadingSpinner />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="container py-5">
        <div className="text-center">
          <FaExclamationTriangle className="text-warning mb-3" size={48} />
          <h3>يجب تسجيل الدخول أولاً</h3>
          <p className="text-muted">يرجى تسجيل الدخول للوصول إلى هذه المجموعة.</p>
          <button 
            onClick={() => router.push('/login')} 
            className="btn btn-primary"
          >
            تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="container py-5">
        <div className="text-center">
          <FaExclamationTriangle className="text-danger mb-3" size={48} />
          <h3>خطأ</h3>
          <p className="text-muted">{error}</p>
          <button 
            onClick={() => router.push('/groups')} 
            className="btn btn-primary"
          >
            العودة للجروبات
          </button>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container py-5">
        <div className="text-center">
          <h3>المجموعة غير موجودة</h3>
          <button 
            onClick={() => router.push('/groups')} 
            className="btn btn-primary"
          >
            العودة للجروبات
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-0" style={{ height: '100vh' }}>
      {!isMember ? (
        // Join group view
        <div className="container py-5">
          <div className="row justify-content-center">
            <div className="col-md-8 col-lg-6">
              <div className="card shadow border-0" style={{ borderRadius: 20 }}>
                {group.coverImageUrl && (
                  <img 
                    src={group.coverImageUrl} 
                    className="card-img-top" 
                    style={{ height: 200, objectFit: 'cover', borderRadius: '20px 20px 0 0' }}
                    alt={group.name}
                  />
                )}
                <div className="card-body text-center p-4">
                  <h2 className="fw-bold mb-3" style={{ color: '#3b3b98' }}>{group.name}</h2>
                  {group.description && (
                    <p className="text-muted mb-4">{group.description}</p>
                  )}
                  <div className="d-flex justify-content-center align-items-center mb-4">
                    <FaUsers className="text-primary me-2" />
                    <span className="fw-bold">{group.memberCount} أعضاء</span>
                  </div>
                  
                  {joinSuccess ? (
                    <div className="alert alert-success d-flex align-items-center" role="alert">
                      <FaCheckCircle className="me-2" />
                      تم الانضمام بنجاح! جاري تحميل المجموعة...
                    </div>
                  ) : (
                    <button 
                      onClick={handleJoinGroup}
                      disabled={joiningGroup}
                      className="btn btn-primary btn-lg px-5 fw-bold"
                      style={{ borderRadius: 25 }}
                    >
                      {joiningGroup ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" />
                          جاري الانضمام...
                        </>
                      ) : (
                        <>
                          <FaSignInAlt className="me-2" />
                          انضم للمجموعة
                        </>
                      )}
                    </button>
                  )}
                  
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
      ) : (
        // Group chat view
        <GroupChat 
          groupId={groupId}
          groupName={group.name}
          initialMessages={initialMessages}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
} 