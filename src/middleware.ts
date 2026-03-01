import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isAuthenticated = !!req.auth
  const isApiRoute = req.nextUrl.pathname.startsWith('/api/')
  const isShareRoute = req.nextUrl.pathname === '/share'
  const isAuthRoute = req.nextUrl.pathname.startsWith('/api/auth')

  if (!isAuthenticated && !isApiRoute && !isShareRoute && !isAuthRoute) {
    return NextResponse.redirect(new URL('/api/auth/signin', req.url))
  }
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)'],
}
