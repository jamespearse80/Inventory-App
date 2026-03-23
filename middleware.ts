export { auth as middleware } from '@/auth'

export const config = {
  // Protect everything except the NextAuth callback routes, static files, and images
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)'],
}
