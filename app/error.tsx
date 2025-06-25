'use client'; // Error components must be Client Components

import { useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="min-vh-100 d-flex flex-column">
      <Navbar />
      <main className="flex-grow-1 d-flex flex-column justify-content-center align-items-center">
        <div className="text-center">
          <h2 className="mb-4">حدث خطأ ما</h2>
          <p className="lead mb-4">نعتذر عن هذا الخطأ. يرجى المحاولة مرة أخرى.</p>
          <div className="d-flex justify-content-center gap-3">
            <button
              onClick={() => reset()}
              className="btn btn-primary px-4 py-2"
            >
              إعادة المحاولة
            </button>
            <Link href="/" className="btn btn-outline-secondary px-4 py-2">
              العودة إلى الصفحة الرئيسية
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}