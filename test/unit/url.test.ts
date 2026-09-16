import { describe, it, expect } from 'vitest'
import { safePath } from '#shared-utils/url'

// One guard for both sides: the magic link the server emails, and the redirect
// the browser performs after signing in.
describe('safePath', () => {
  it('passes same-site absolute paths through untouched', () => {
    expect(safePath('/user/auth')).toBe('/user/auth')
    expect(safePath('/search?q=a&b=c#top')).toBe('/search?q=a&b=c#top')
  })

  it('rejects protocol-relative and backslash paths that leave the site', () => {
    expect(safePath('//evil.example')).toBe('/')
    expect(safePath('/\\evil.example')).toBe('/')
    expect(safePath('///evil.example')).toBe('/')
  })

  it('rejects absolute URLs and scheme tricks', () => {
    expect(safePath('https://evil.example/x')).toBe('/')
    expect(safePath('javascript:alert(1)')).toBe('/')
    expect(safePath('data:text/html,x')).toBe('/')
  })

  it('rejects relative paths and non-strings', () => {
    expect(safePath('user/auth')).toBe('/')
    expect(safePath(undefined)).toBe('/')
    expect(safePath(['/a', '/b'])).toBe('/')
    expect(safePath('')).toBe('/')
  })

  it('honours a caller-supplied fallback', () => {
    expect(safePath('https://evil.example', '/signin')).toBe('/signin')
  })
})
