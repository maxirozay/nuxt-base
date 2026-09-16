import { describe, it, expect, beforeEach } from 'vitest'
import { resetTestState, storage } from '../setup'
import { buildEmailTemplate, escapeHtml } from '#server-utils/email'

beforeEach(resetTestState)

function seedTemplate(html: string, locale = 'en', id = 'test') {
  storage.set(`assets:server:emails/${locale}/${id}.html`, html)
}

describe('escapeHtml', () => {
  it('neutralises the characters that carry markup', () => {
    expect(escapeHtml(`<img src=x onerror="alert('1')">&`)).toBe(
      '&lt;img src=x onerror=&quot;alert(&#39;1&#39;)&quot;&gt;&amp;',
    )
  })
})

describe('buildEmailTemplate', () => {
  it('fills placeholders', async () => {
    seedTemplate('<title>Your code</title><p>{{otp}}</p>')
    const { subject, html } = await buildEmailTemplate('test', 'en', { otp: '123456' })
    expect(subject).toBe('Your code')
    expect(html).toContain('<p>123456</p>')
  })

  // Params carry user-controlled values (an email address, a name), and they land
  // in HTML that we send on the user's behalf.
  it('escapes params in the body', async () => {
    seedTemplate('<title>t</title><p>{{email}}</p>')
    const { html } = await buildEmailTemplate('test', 'en', {
      email: '<script>alert(1)</script>@x.test',
    })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('leaves the subject as plain text', async () => {
    seedTemplate('<title>{{name}} & co</title><p>x</p>')
    const { subject } = await buildEmailTemplate('test', 'en', { name: 'A&B' })
    expect(subject).toBe('A&B & co')
  })

  it('keeps a magic link usable once escaped', async () => {
    seedTemplate('<title>t</title><a href="{{magicLink}}">go</a>')
    const { html } = await buildEmailTemplate('test', 'en', {
      magicLink: 'https://app.test/signin?email=a%40b.test&token=abc',
    })
    // &amp; in an href is the correct spelling of a literal &.
    expect(html).toContain('href="https://app.test/signin?email=a%40b.test&amp;token=abc"')
  })

  it('renders a missing param as empty, not as the placeholder', async () => {
    seedTemplate('<title>t</title><p>[{{missing}}]</p>')
    const { html } = await buildEmailTemplate('test', 'en', {})
    expect(html).toContain('[]')
  })

  it('falls back to the english template for an unknown locale', async () => {
    seedTemplate('<title>english</title><p>en</p>')
    const { subject } = await buildEmailTemplate('test', 'de', {})
    expect(subject).toBe('english')
  })

  it('throws when no template exists at all', async () => {
    await expect(buildEmailTemplate('nope', 'en', {})).rejects.toThrow(/Email template not found/)
  })
})
