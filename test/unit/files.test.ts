import { describe, it, expect, beforeEach } from 'vitest'
import { resetTestState, setConfig } from '../setup'
import { getSecurePath, removeRoot, parseRangeHeader, getFileURL } from '#server-utils/files'

beforeEach(resetTestState)

describe('getSecurePath', () => {
  it('prefixes the configured root', () => {
    expect(getSecurePath('u/123/avatar.png')).toBe('files/private/u/123/avatar.png')
    expect(getSecurePath('logo.png', false)).toBe('files/public/logo.png')
  })

  it('does not prefix the root twice', () => {
    expect(getSecurePath('files/private/u/123')).toBe('files/private/u/123')
  })

  it('strips leading slashes and a trailing slash', () => {
    expect(getSecurePath('///u/123/')).toBe('files/private/u/123')
  })

  it('rejects traversal segments', () => {
    for (const path of ['../etc/passwd', 'u/123/../../etc', 'u/./123', '/../secrets']) {
      expect(() => getSecurePath(path)).toThrowError(/Invalid path/)
    }
  })

  it('keeps dots that are part of a name', () => {
    expect(getSecurePath('u/123/..hidden')).toBe('files/private/u/123/..hidden')
    expect(getSecurePath('u/123/file.tar.gz')).toBe('files/private/u/123/file.tar.gz')
  })

  it('follows a relocated root', () => {
    setConfig({ filesPrivateFolder: 'data/secret' })
    expect(getSecurePath('u/1')).toBe('data/secret/u/1')
  })
})

describe('removeRoot', () => {
  it('strips the root prefix once', () => {
    expect(removeRoot('files/private/u/1')).toBe('u/1')
    expect(removeRoot('u/1')).toBe('u/1')
  })
})

describe('getFileURL', () => {
  it('routes private files through the API and public files through the files host', () => {
    expect(getFileURL('files/private/u/1/a.png')).toBe(
      'https://app.test/api/files/u/1/a.png?isPrivate=true',
    )
    expect(getFileURL('files/public/logo.png', false)).toBe('/files/logo.png')
  })
})

describe('parseRangeHeader', () => {
  const size = 1000

  it('returns null without a range', () => {
    expect(parseRangeHeader(undefined, size)).toBeNull()
    expect(parseRangeHeader('items=0-10', size)).toBeNull()
  })

  it('parses a closed range and clamps the end to the last byte', () => {
    expect(parseRangeHeader('bytes=0-99', size)).toEqual({ start: 0, end: 99 })
    expect(parseRangeHeader('bytes=500-5000', size)).toEqual({ start: 500, end: 999 })
  })

  it('treats an open end as the rest of the file', () => {
    expect(parseRangeHeader('bytes=500-', size)).toEqual({ start: 500, end: 999 })
  })

  it('reads a suffix range from the end', () => {
    expect(parseRangeHeader('bytes=-200', size)).toEqual({ start: 800, end: 999 })
    // Asking for more than the file holds yields the whole file, not a negative start.
    expect(parseRangeHeader('bytes=-5000', size)).toEqual({ start: 0, end: 999 })
  })

  it('reports unsatisfiable ranges', () => {
    expect(parseRangeHeader('bytes=1000-', size)).toBe('unsatisfiable')
    expect(parseRangeHeader('bytes=900-100', size)).toBe('unsatisfiable')
    expect(parseRangeHeader('bytes=-0', size)).toBe('unsatisfiable')
  })
})
