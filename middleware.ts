import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  // المسارات العامة التي لا تحتاج مصادقة
  const publicPaths = [
    '/',
    '/login',
    '/register',
    '/api/auth/login',
    '/api/auth/register',
    '/api/socket',
    '/features'
  ];

  // المسارات التي تحتاج مصادقة
  const protectedPaths = [
    '/groups',
    '/group',
    '/api/groups',
    '/api/user',
    '/api/upload-media'
  ];

  // التحقق من المسارات العامة
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // التحقق من المسارات المحمية
  if (protectedPaths.some(path => pathname.startsWith(path))) {
    if (!token) {
      // إعادة توجيه إلى صفحة تسجيل الدخول إذا لم يكن هناك توكن
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // التحقق من المسارات الإدارية
  if (pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // هنا يمكن إضافة منطق إضافي للتحقق من صلاحيات المدير
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}; 