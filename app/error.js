'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="error-container">
      <h2>حدث خطأ غير متوقع</h2>
      <p>نعتذر عن هذا الخطأ. يرجى المحاولة مرة أخرى.</p>
      <button
        onClick={() => reset()}
        className="retry-button"
      >
        إعادة المحاولة
      </button>
    </div>
  );
}