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
    <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm mb-4">
      <div className="container-fluid">
        <Link className="navbar-brand fw-bold text-primary" href="/">
          Gam3a5G.com
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNavbar"
          aria-controls="mainNavbar"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="mainNavbar">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item">
              <Link className="nav-link" href="/">Home</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" href="/groups">Groups</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" href="/events">Events</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" href="/jobs">Jobs</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" href="/notifications">Notifications</Link>
            </li>
          </ul>
          <form className="d-flex me-3" role="search">
            <input
              className="form-control"
              type="search"
              placeholder="Search"
              aria-label="Search"
              style={{ minWidth: 180 }}
            />
          </form>
          <div className="d-flex align-items-center gap-2">
            <Link href="/profile">
              <img
                src="/default-avatar.png"
                alt="Profile"
                className="rounded-circle"
                width={36}
                height={36}
                style={{ objectFit: "cover", border: "1px solid #eee" }}
              />
            </Link>
            <button className="btn btn-outline-primary rounded-circle p-1" title="Add">
              <span style={{ fontSize: 24, lineHeight: 1 }}>+</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
