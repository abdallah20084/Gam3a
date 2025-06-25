'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/LoadingSpinner';
import axios from 'axios';

interface Group {
  _id: string;
  name: string;
  description: string;
  memberCount: number;
  createdAt: string;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await axios.get('/api/groups');
        if (response.status === 200) {
          setGroups(response.data.groups);
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

  return (
    <div className="min-vh-100 bg-light d-flex flex-column">
      <main className="container py-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="h2 fw-bold">المجموعات</h1>
          <Link href="/groups/create" className="btn btn-primary">
            <i className="bi bi-plus-lg me-1"></i> إنشاء مجموعة
          </Link>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : groups.length === 0 ? (
          <div className="alert alert-info">لا توجد مجموعات متاحة حاليًا</div>
        ) : (
          <div className="row g-4">
            {groups.map((group) => (
              <div key={group._id} className="col-12 col-md-6 col-lg-4">
                <div className="card h-100 shadow-sm">
                  <div className="card-body">
                    <h5 className="card-title fw-bold">{group.name}</h5>
                    <p className="card-text text-secondary small">
                      {group.description?.length > 100
                        ? `${group.description.substring(0, 100)}...`
                        : group.description || 'لا يوجد وصف'}
                    </p>
                    <div className="d-flex justify-content-between align-items-center">
                      <small className="text-muted">
                        <i className="bi bi-people me-1"></i>
                        {group.memberCount} أعضاء
                      </small>
                      <Link
                        href={`/group/${group._id}`}
                        className="btn btn-sm btn-outline-primary"
                      >
                        عرض المجموعة
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}


