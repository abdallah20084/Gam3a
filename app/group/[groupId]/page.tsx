// app/group/[groupId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import GroupChat from '@/components/GroupChat';
import LoadingSpinner from '@/components/LoadingSpinner';
import { getValidToken } from '@/lib/auth';

export default function GroupPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState([]);
  const [userId, setUserId] = useState('');
  const [initialMessages, setInitialMessages] = useState([]);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        const token = getValidToken();
        if (!token) {
          setAuthError(true);
          setLoading(false);
          return;
        }

        // استخدام التوكن الصالح
        const response = await axios.get(`/api/groups/${groupId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log("Group API response:", response.data);
        if (response.data.success) {
          setGroup(response.data.group);
          setMembers(response.data.group.members || []);
          setUserId(response.data.currentUserId);
          
          // جلب الرسائل الأولية
          try {
            const messagesResponse = await axios.get(`/api/groups/${groupId}/messages`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            if (messagesResponse.data.success) {
              // عكس ترتيب الرسائل عشان تظهر من الأقدم للأحدث
              const messages = messagesResponse.data.messages || [];
              setInitialMessages(messages.reverse());
            }
          } catch (messageError) {
            console.error('Error fetching messages:', messageError);
            // استمر في تحميل الصفحة حتى لو فشل جلب الرسائل
            setInitialMessages([]);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching group data:', error);
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          setAuthError(true);
        }
        setLoading(false);
      }
    };

    if (groupId) {
      fetchGroupData();
    }
  }, [groupId, router]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (authError) {
    return (
      <div className="container mt-5 text-center">
        <div className="alert alert-warning">
          يرجى تسجيل الدخول لعرض هذه المجموعة
          <div className="mt-3">
            <button 
              onClick={() => router.push('/auth/login')} 
              className="btn btn-primary"
            >
              تسجيل الدخول
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container mt-5 text-center">
        <div className="alert alert-danger">
          لم يتم العثور على المجموعة أو ليس لديك صلاحية الوصول إليها.
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-0">
      <GroupChat
        groupId={groupId}
        userId={userId}
        members={members}
        initialMessages={initialMessages}
        groupName={group.name} // تمرير اسم المجموعة
        isAdmin={group.admin === userId} // تمرير معلومة الأدمن
      />
    </div>
  );
}







