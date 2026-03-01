import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/auth', () => ({
  auth: <T extends (req: unknown) => Response | undefined>(handler: T) => handler,
}))

import middleware from '@/middleware'

type MockReq = {
  auth: { user: { id: string } } | null
  url: string
  nextUrl: URL
}

function makeReq(pathname: string, authenticated: boolean): MockReq {
  const url = `https://langbuddy-taupe.vercel.app${pathname}`
  return {
    auth: authenticated ? { user: { id: 'user-1' } } : null,
    url,
    nextUrl: new URL(url),
  }
}

describe('middleware', () => {
  it('does not redirect unauthenticated API routes', () => {
    const req = makeReq('/api/articles/adapt', false)
    const res = middleware(req as Parameters<typeof middleware>[0])
    expect(res).toBeUndefined()
  })

  it('redirects unauthenticated page routes to sign-in', () => {
    const req = makeReq('/articles/new', false)
    const res = middleware(req as Parameters<typeof middleware>[0])
    expect(res?.status).toBe(307)
    expect(res?.headers.get('location')).toBe('https://langbuddy-taupe.vercel.app/api/auth/signin')
  })

  it('does not redirect unauthenticated share route', () => {
    const req = makeReq('/share', false)
    const res = middleware(req as Parameters<typeof middleware>[0])
    expect(res).toBeUndefined()
  })

  it('does not redirect authenticated page routes', () => {
    const req = makeReq('/articles/new', true)
    const res = middleware(req as Parameters<typeof middleware>[0])
    expect(res).toBeUndefined()
  })
})
