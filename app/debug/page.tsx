'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { getValidToken } from '@/lib/auth';

export default function DebugPage() {
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDebugData = async () => {
      try {
        setLoading(true);
        const token = getValidToken();
        
        if (!token) {
          setError('No token found');
          setLoading(false);
          return;
        }

        const response = await axios.get('/api/groups', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
          setDebugData(response.data);
        } else {
          setError(response.data.error || 'Failed to fetch debug data');
        }
      } catch (err: any) {
        console.error('Debug fetch error:', err);
        setError(err.message || 'Failed to fetch debug data');
      } finally {
        setLoading(false);
      }
    };

    fetchDebugData();
  }, []);

  if (loading) {
    return (
      <div className="container py-5">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">جاري تحميل بيانات التصحيح...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">
          <h4>خطأ في التصحيح</h4>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <h1 className="mb-4">صفحة التصحيح - فحص البيانات</h1>
      
      {debugData && (
        <div className="row">
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h5>إحصائيات قاعدة البيانات</h5>
              </div>
              <div className="card-body">
                <ul className="list-group list-group-flush">
                  <li className="list-group-item d-flex justify-content-between">
                    <span>إجمالي المجموعات:</span>
                    <span className="badge bg-primary">{debugData.debug?.totalGroups || 0}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between">
                    <span>إجمالي أعضاء المجموعات:</span>
                    <span className="badge bg-info">{debugData.debug?.totalGroupMembers || 0}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between">
                    <span>إجمالي المستخدمين:</span>
                    <span className="badge bg-success">{debugData.debug?.totalUsers || 0}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between">
                    <span>مجموعات المستخدم الحالي:</span>
                    <span className="badge bg-warning">{debugData.debug?.userGroups || 0}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h5>مجموعات المستخدم</h5>
              </div>
              <div className="card-body">
                {debugData.groups && debugData.groups.length > 0 ? (
                  <ul className="list-group list-group-flush">
                    {debugData.groups.map((group: any) => (
                      <li key={group.id} className="list-group-item">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="mb-1">{group.name}</h6>
                            <small className="text-muted">{group.description || 'لا يوجد وصف'}</small>
                          </div>
                          <div className="text-end">
                            <span className="badge bg-secondary me-2">{group.role}</span>
                            <span className="badge bg-primary">{group.memberCount} عضو</span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted">لا توجد مجموعات للمستخدم</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-4">
        <div className="card">
          <div className="card-header">
            <h5>بيانات التصحيح الكاملة</h5>
          </div>
          <div className="card-body">
            <pre className="bg-light p-3 rounded" style={{maxHeight: '400px', overflow: 'auto'}}>
              {JSON.stringify(debugData, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
} 