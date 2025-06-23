// components/Navbar.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    setIsLoggedIn(!!token);
    setUserName(localStorage.getItem('userName'));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName'); 
    localStorage.removeItem('userId');
    localStorage.removeItem('isSuperAdmin');
    setIsLoggedIn(false);
    router.push('/auth/login');
  };

  useEffect(() => {
    import('bootstrap/dist/js/bootstrap.bundle.min.js');
  }, []);

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm px-3" dir="rtl">
      <div className="container-fluid">
        {/* Logo */}
        <Link href="/" className="navbar-brand fw-bold text-primary fs-3">
          Gam3a5G.com
        </Link>

        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNavbar" aria-controls="mainNavbar" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="mainNavbar">
          {/* محتويات النافبار */}
          <ul className="navbar-nav me-auto mb-2 mb-lg-0 gap-2 w-100">
            {isLoggedIn && (
              <li className="nav-item d-lg-none mb-3">
                <div className="d-flex align-items-center">
                  <img className="rounded-circle" src="/images/1.jpg" alt="User Avatar" width={40} height={40} />
                  <span className="ms-2 fw-bold">{userName || 'المستخدم'}</span>
                </div>
              </li>
            )}
            <li className="nav-item">
              <Link href="/" className="nav-link">الرئيسية</Link>
            </li>
            <li className="nav-item">
              <Link href="/groups" className="nav-link">المجموعات</Link>
            </li>
            <li className="nav-item">
              <Link href="/events" className="nav-link">الفعاليات</Link>
            </li>
            <li className="nav-item">
              <Link href="/jobs" className="nav-link">الوظائف</Link>
            </li>
            <li className="nav-item">
              <Link href="/notifications" className="nav-link">الإشعارات</Link>
            </li>
            {isLoggedIn && (
              <>
                <li className="nav-item d-lg-none">
                  <Link href="/profile" className="nav-link">الملف الشخصي</Link>
                </li>
                <li className="nav-item d-lg-none">
                  <Link href="/settings" className="nav-link">الإعدادات</Link>
                </li>
                <li className="nav-item d-lg-none mt-3">
                  <button className="btn btn-danger w-100" onClick={handleLogout}>
                    تسجيل الخروج
                  </button>
                </li>
              </>
            )}
            {!isLoggedIn && (
              <>
                <li className="nav-item d-lg-none mt-3">
                  <Link href="/auth/login" className="btn btn-primary w-100 mb-2">
                    تسجيل الدخول
                  </Link>
                  <Link href="/auth/register" className="btn btn-outline-secondary w-100">
                    التسجيل
                  </Link>
                </li>
              </>
            )}
          </ul>

          {/* عناصر اليمين في الشاشات الكبيرة */}
          <div className="d-none d-lg-flex align-items-center gap-2">
            {isLoggedIn ? (
              <>
                <button className="btn btn-link text-secondary p-0 me-2" title="الإشعارات">
                  <i className="bi bi-bell fs-4"></i>
                </button>
                <div className="dropdown">
                  <button
                    className="btn btn-link p-0 me-2 dropdown-toggle d-flex align-items-center"
                    type="button"
                    id="userDropdown"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    <img className="rounded-circle" src="/images/1.jpg" alt="User Avatar" width={36} height={36} />
                    <span className="ms-2 fw-bold">{userName || 'المستخدم'}</span>
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end text-end" aria-labelledby="userDropdown">
                    <li>
                      <Link href="/profile" className="dropdown-item">الملف الشخصي</Link>
                    </li>
                    <li>
                      <Link href="/settings" className="dropdown-item">الإعدادات</Link>
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <button className="dropdown-item text-danger" onClick={handleLogout}>تسجيل الخروج</button>
                    </li>
                  </ul>
                </div>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="btn btn-primary fw-bold px-3">
                  تسجيل الدخول
                </Link>
                <Link href="/auth/register" className="btn btn-outline-secondary fw-bold px-3">
                  التسجيل
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
