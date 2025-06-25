'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Script from 'next/script';

export default function Navbar() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    setIsLoggedIn(!!token);
    setUserName(localStorage.getItem('userName'));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName'); 
    localStorage.removeItem('userId');
    setIsLoggedIn(false);
    router.push('/auth/login');
  };

  // إغلاق القائمة عند الضغط خارجها
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        const dropdownMenu = dropdownRef.current.querySelector('.dropdown-menu');
        if (dropdownMenu?.classList.contains('show')) {
          (dropdownRef.current.querySelector('[data-bs-toggle="dropdown"]') as HTMLElement)?.click();
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // تحميل جافاسكريبت البوتستراب لدعم القوائم المنسدلة والـ collapse
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // تعريف window.bootstrap لتجنب أخطاء TypeScript
      declare global {
        interface Window {
          bootstrap: any;
        }
      }
      
      // استخدام dynamic import مع معالجة الأخطاء
      import('bootstrap/dist/js/bootstrap.bundle.min.js')
        .then(() => {
          // تأخير التهيئة للتأكد من تحميل Bootstrap بالكامل
          setTimeout(() => {
            // تهيئة جميع عناصر Bootstrap
            const dropdownElementList = document.querySelectorAll('[data-bs-toggle="dropdown"]');
            dropdownElementList.forEach(element => {
              if (window.bootstrap && window.bootstrap.Dropdown) {
                new window.bootstrap.Dropdown(element);
              }
            });
          }, 100);
        })
        .catch(err => {
          console.error('فشل في تحميل Bootstrap:', err);
        });
    }
  }, []);

  // أضف هذا المكون لتحميل Bootstrap JS
  const BootstrapScript = () => {
    return (
      <Script
        src="/bootstrap/dist/js/bootstrap.bundle.min.js"
        strategy="afterInteractive"
      />
    );
  };

  return (
    <>
    <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm px-3" dir="rtl">
      <div className="container-fluid">
        {/* Logo */}
        <Link href="/" className="navbar-brand fw-bold text-primary fs-3 shadow-hover">
          Gam3a5G.com
        </Link>

        {/* زر القائمة الجانبية للموبايل */}
        <button className="navbar-toggler shadow-hover" type="button" data-bs-toggle="collapse" data-bs-target="#mainNavbar" aria-controls="mainNavbar" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="mainNavbar">
          {/* قائمة الروابط الرئيسية */}
          <ul className="navbar-nav me-auto mb-2 mb-lg-0 gap-2 w-100">
            {isLoggedIn && (
              <li className="nav-item d-lg-none mb-3">
                <div className="d-flex align-items-center shadow-hover px-2 py-1 rounded-3">
                  <img className="rounded-circle" src="/images/1.jpg" alt="User Avatar" width={40} height={40} />
                  <span className="ms-2 fw-bold text-dark">{userName || 'المستخدم'}</span>
                </div>
              </li>
            )}
            <li className="nav-item">
              <Link href="/" className="nav-link shadow-hover fw-bold fs-4 text-dark">الرئيسية</Link>
            </li>
            <li className="nav-item">
              <Link href="/groups" className="nav-link shadow-hover fw-bold fs-4 text-dark">الجروبات</Link>
            </li>
            <li className="nav-item">
              <span className="fw-bold fs-4 text-muted px-2" style={{ cursor: 'not-allowed' }}>شقق وعقارات قريبًا</span>
            </li>
            <li className="nav-item">
              <span className="fw-bold fs-4 text-muted px-2" style={{ cursor: 'not-allowed' }}>مطاعم قريبًا</span>
            </li>
            
            <li className="nav-item">
              <Link href="/features" className="nav-link shadow-hover fw-bold fs-4 text-dark">مميزات التطبيق</Link>
            </li>
            {isLoggedIn && (
              <>
                <li className="nav-item d-lg-none">
                  <Link href="/profile" className="nav-link shadow-hover fw-semibold fs-5 text-dark">الملف الشخصي</Link>
                </li>
                <li className="nav-item d-lg-none">
                  <Link href="/settings" className="nav-link shadow-hover fw-semibold fs-5 text-dark">الإعدادات</Link>
                </li>
                <li className="nav-item d-lg-none mt-3">
                  <button className="btn btn-danger w-100 fw-semibold fs-5 btn-glow" onClick={handleLogout}>
                    تسجيل الخروج
                  </button>
                </li>
              </>
            )}
            {!isLoggedIn && (
              <>
                <li className="nav-item d-lg-none mt-3">
                  <Link href="/auth/login" className="btn btn-primary w-100 mb-2 fw-semibold fs-5 btn-glow">
                    تسجيل الدخول
                  </Link>
                  <Link href="/auth/register" className="btn btn-outline-secondary w-100 fw-semibold fs-5 btn-glow">
                    التسجيل
                  </Link>
                </li>
              </>
            )}
          </ul>

          {/* عناصر اليمين في الشاشات الكبيرة */}
          <div className="d-none d-lg-flex align-items-center gap-3">
            {isLoggedIn ? (
              <>
                {/* أيقونة الرسايل مع قائمة منسدلة */}
                <div className="dropdown me-2">
                  <button
                    className="btn btn-link p-0 shadow-hover"
                    type="button"
                    id="messagesDropdown"
                    data-bs-toggle="dropdown"
                    data-bs-auto-close="true"
                    aria-expanded="false"
                    style={{ transition: 'box-shadow 0.2s', fontSize: '1.7rem' }}
                  >
                    <i className="bi bi-chat-dots text-secondary"></i>
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end text-end" aria-labelledby="messagesDropdown" style={{ minWidth: 260 }}>
                    <li className="dropdown-header fw-bold">الرسائل</li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <span className="dropdown-item text-muted">لا توجد رسائل جديدة</span>
                    </li>
                  </ul>
                </div>
                {/* أيقونة الجرس مع قائمة منسدلة */}
                <div className="dropdown me-2">
                  <button
                    className="btn btn-link p-0 shadow-hover"
                    type="button"
                    id="notificationsDropdown"
                    data-bs-toggle="dropdown"
                    data-bs-auto-close="true"
                    aria-expanded="false"
                    style={{ transition: 'box-shadow 0.2s', fontSize: '1.7rem' }}
                  >
                    <i className="bi bi-bell text-secondary"></i>
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end text-end" aria-labelledby="notificationsDropdown" style={{ minWidth: 260 }}>
                    <li className="dropdown-header fw-bold">الإشعارات</li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <span className="dropdown-item text-muted">لا توجد إشعارات جديدة</span>
                    </li>
                  </ul>
                </div>
                {/* صورة واسم المستخدم مع قائمة منسدلة */}
                <div className="dropdown" ref={dropdownRef}>
                  <button
                    className="btn btn-link p-0 me-2 d-flex align-items-center shadow-hover"
                    type="button"
                    id="userDropdown"
                    data-bs-toggle="dropdown"
                    data-bs-auto-close="true"
                    aria-expanded="false"
                    style={{ cursor: 'pointer', transition: 'box-shadow 0.2s' }}
                  >
                    <span
                      className="fw-bold text-dark user-select-none"
                      style={{
                        fontSize: '1.1rem',
                        textTransform: 'capitalize',
                        textDecoration: 'none',
                        letterSpacing: '0.5px'
                      }}
                    >
                      {userName
                        ? userName
                            .split(' ')
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ')
                        : 'المستخدم'}
                    </span>
                    <img
                      className="rounded-circle ms-2"
                      src="/images/1.jpg"
                      alt="User Avatar"
                      width={38}
                      height={38}
                    />
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end text-end" aria-labelledby="userDropdown">
                    <li>
                      <Link href="/profile" className="dropdown-item shadow-hover fw-semibold fs-6 text-dark">الملف الشخصي</Link>
                    </li>
                    <li>
                      <Link href="/settings" className="dropdown-item shadow-hover fw-semibold fs-6 text-dark">الإعدادات</Link>
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <button className="dropdown-item text-danger fw-semibold fs-6 btn-glow" onClick={handleLogout}>تسجيل الخروج</button>
                    </li>
                  </ul>
                </div>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="btn btn-primary fw-bold px-3 fs-5 btn-glow">
                  تسجيل الدخول
                </Link>
                <Link href="/auth/register" className="btn btn-outline-secondary fw-bold px-3 fs-5 btn-glow">
                  التسجيل
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
    <style jsx global>{`
      .shadow-hover:hover, .shadow-hover:focus {
        box-shadow: 0 2px 12px 0 rgba(0,0,0,0.12), 0 1.5px 4px 0 rgba(0,0,0,0.10);
        background: #f6f8fa;
        text-decoration: none !important;
      }
      .navbar .nav-link, .navbar .btn, .dropdown-item {
        text-decoration: none !important;
        transition: box-shadow 0.2s, background 0.2s;
      }
      .navbar .nav-link,
      .navbar .dropdown-item {
        color: #222 !important;
      }
      /* تأثير مختلف للأزرار المهمة */
      .btn-glow:hover, .btn-glow:focus {
        box-shadow: 0 0 0 0.25rem rgba(13,110,253,.15) !important;
        background: #f0f4ff !important;
        filter: brightness(1.05);
      }
      .btn-danger.btn-glow:hover, .btn-danger.btn-glow:focus,
      .dropdown-item.text-danger.btn-glow:hover, .dropdown-item.text-danger.btn-glow:focus {
        background: #ffebee !important;
        color: #c00 !important;
        box-shadow: 0 0 0 0.25rem rgba(220,53,69,.12) !important;
      }
    `}</style>
    {/* تحميل Bootstrap JS */}
    <BootstrapScript />
    </>
  );
}














