import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token');

  // Public paths that don't need auth
  const publicPaths = ['/login', '/'];
  const isPublicPath = publicPaths.includes(pathname);

  // If trying to access protected route without token
  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If logged in and trying to access login page
  if (isPublicPath && token && pathname !== '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip all internal paths (_next, api, static files)
    '/((?!_next|api|.*\\.).*)',
  ],
};