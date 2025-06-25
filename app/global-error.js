'use client'; // Error boundaries must be Client Components

export default function GlobalError({
  error,
  reset,
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="global-error-container">
          <h2>حدث خطأ في التطبيق</h2>
          <p>نعتذر عن هذا الخطأ. يرجى المحاولة مرة أخرى.</p>
          <button
            onClick={() => reset()}
            className="retry-button"
          >
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  );
}