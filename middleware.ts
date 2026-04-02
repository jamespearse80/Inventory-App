export { auth as middleware } from '@/auth'

export const config = {
  // Protect everything except the NextAuth callback routes, static files, images, and admin endpoints
  matcher: ['/((?!api/auth|api/admin|_next/static|_next/image|favicon.ico|public).*)'],
}
