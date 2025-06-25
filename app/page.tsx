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
import { FaUsers, FaStar, FaRocket } from 'react-icons/fa';

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
  return (
    <div className="container d-flex flex-column justify-content-center align-items-center py-5" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)' }}>
      <div className="card shadow-lg border-0 p-4 text-center" style={{ borderRadius: 24, maxWidth: 500, background: '#fff' }}>
        <div className="mb-3">
          <FaRocket size={48} className="text-primary" />
        </div>
        <h1 className="fw-bold mb-3" style={{ color: '#3b3b98' }}>مرحبًا بك في Gam3a5G</h1>
        <p className="text-muted mb-4 fs-5">تواصل، شارك، واستمتع بأحدث تجربة دردشة جماعية ووسائط اجتماعية بواجهة عصرية وميزات قوية.</p>
        <div className="d-flex gap-3 justify-content-center">
          <Link href="/groups" className="btn btn-primary btn-lg px-4 fw-bold" style={{ borderRadius: 20 }}><FaUsers className="me-2" />الجروبات</Link>
          <Link href="/features" className="btn btn-outline-primary btn-lg px-4 fw-bold" style={{ borderRadius: 20 }}><FaStar className="me-2" />مميزات التطبيق</Link>
        </div>
      </div>
    </div>
  );
}


