'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/LoadingSpinner';
import axios from 'axios';
import { FaUsers } from 'react-icons/fa';
import DOMPurify from 'isomorphic-dompurify';

interface Group {
  _id: string;
  name: string;
  description: string;
  memberCount: number;
  createdAt: string;
  isAdmin?: boolean;
  coverImageUrl?: string;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const [tabType, setTabType] = useState<'all' | 'joined' | 'myGroups'>('all');

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await axios.get('/api/groups', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (response.status === 200) {
          setGroups(response.data.groups);
          console.log('جروبات من الـ API:', response.data.groups);
        } else {
          setError('فشل في جلب المجموعات');
        }
      } catch (err) {
        setError('حدث خطأ أثناء جلب المجموعات');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  // طباعة معلومات التبويبات
  useEffect(() => {
    console.log('التبويب الحالي:', tabType);
    console.log('كل الجروبات:', groups.length);
    console.log('مجموعاتي:', groups.filter(g => g.isMember).length);
    console.log('مجموعات أديرها:', groups.filter(g => g.isAdmin).length);
  }, [tabType, groups]);

  const allGroups = groups;
  const joinedGroups = groups.filter(g => g.isMember);
  const myGroups = groups.filter(g => g.isAdmin);

  let filteredGroups = allGroups;
  if (tabType === 'joined') filteredGroups = joinedGroups;
  if (tabType === 'myGroups') filteredGroups = myGroups;

  return (
    <div className="container py-5" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)', minHeight: '100vh' }}>
      <h2 className="text-center mb-4 fw-bold" style={{ color: '#3b3b98' }}><FaUsers className="me-2 text-primary" />الجروبات</h2>
      {/* التبويبات وزر إنشاء مجموعة */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div className="d-flex gap-2">
          <button className={`btn ${tabType === 'all' ? 'btn-primary' : 'btn-outline-primary'} rounded-pill fw-bold`} onClick={() => setTabType('all')}>كل المجموعات</button>
          <button className={`btn ${tabType === 'joined' ? 'btn-primary' : 'btn-outline-primary'} rounded-pill fw-bold`} onClick={() => setTabType('joined')}>مجموعاتي</button>
          <button className={`btn ${tabType === 'myGroups' ? 'btn-primary' : 'btn-outline-primary'} rounded-pill fw-bold`} onClick={() => setTabType('myGroups')}>مجموعات أديرها</button>
        </div>
        <Link href="/groups/create" className="btn btn-success rounded-pill fw-bold px-4" style={{ fontSize: 18, minWidth: 200 }}>
          <i className="bi bi-plus-circle me-1"></i> إنشاء مجموعة جديدة
        </Link>
      </div>
      <div className="row g-4">
        {filteredGroups.length === 0 ? (
          <div className="col-12 text-center text-muted fs-4" key="no-groups">لا توجد جروبات بعد.</div>
        ) : (
          filteredGroups.map(group => (
            <div className="col-12 col-md-6 col-lg-4" key={group._id || group.id}>
              <div className="card shadow-sm border-0" style={{ borderRadius: 18 }}>
                <img src={group.coverImageUrl || '/default-group.png'} className="card-img-top" style={{ borderRadius: '18px 18px 0 0', height: 180, objectFit: 'cover' }} />
                <div className="card-body text-center">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h5 className="fw-bold mb-2 mb-0" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(group.name) }} />
                    <span className="badge bg-info ms-2"><i className="bi bi-people"></i> {group.memberCount} أعضاء</span>
                  </div>
                  <p className="text-muted" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(group.description) }} />
                  <Link href={`/group/${group._id || group.id}`} className="btn btn-primary btn-glow px-4 mt-2" style={{ borderRadius: 20 }}>دخول المجموعة</Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


