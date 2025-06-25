import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-vh-100 d-flex flex-column">
      <main className="flex-grow-1 d-flex flex-column justify-content-center align-items-center">
        <div className="text-center">
          <h1 className="display-1 fw-bold">404</h1>
          <h2 className="mb-4">الصفحة غير موجودة</h2>
          <p className="lead mb-5">عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.</p>
          <Link href="/" className="btn btn-primary px-4 py-2">
            العودة إلى الصفحة الرئيسية
          </Link>
        </div>
      </main>
    </div>
  );
}