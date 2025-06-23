// components/Navbar.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName'); 
    localStorage.removeItem('userId');
    localStorage.removeItem('isSuperAdmin');
    setIsLoggedIn(false);
    router.push('/auth/login');
  };

  return (
    <header className="bg-white shadow-md py-4 px-6 flex items-center justify-between w-full">
      {/* Website Logo - Gam3a5G.com */}
      <Link href="/" className="text-2xl font-bold text-blue-600 flex-shrink-0">
        Gam3a5G.com
      </Link>

      {/* Buttons/Icons Group on the Right */}
      <div className="flex items-center space-x-4 rtl:space-x-reverse flex-wrap justify-end">
        {isLoggedIn ? (
          <>
            {/* Notification Bell */}
            <button className="text-gray-600 hover:text-blue-600 focus:outline-none">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
              </svg>
            </button>
            {/* User Image */}
            <button className="flex items-center space-x-2 rtl:space-x-reverse focus:outline-none">
              <img className="w-8 h-8 rounded-full" src="/images/1.jpg" alt="User Avatar" />
            </button>
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 flex-shrink-0"
            >
              تسجيل الخروج
            </button>
          </>
        ) : (
          <>
            {/* Login Button */}
            <Link href="/auth/login" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 flex-shrink-0">
              تسجيل الدخول
            </Link>
            {/* Register Button */}
            <Link href="/auth/register" className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg transition duration-200 flex-shrink-0">
              التسجيل
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
