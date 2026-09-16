import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { resetTestState, logSpy, session, config } from '../setup'
import { enforceRateLimit } from '#server-utils/rateLimit'

const rule = { limit: 3, window: 60 }
const event = { ip: '203.0.113.1' } as any

// The limiter keeps one module-level map, so every test needs its own route key.
let routeId = 0
const nextRoute = () => `/api/test/${routeId++}`

beforeEach(() => {
  resetTestState()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
})

afterEach(() => vi.useRealTimers())

async function hit(route: string, times: number, ev: any = event) {
  for (let i = 0; i < times; i++) await enforceRateLimit(ev, route, rule)
}

describe('enforceRateLimit', () => {
  it('allows requests up to the limit', async () => {
    const route = nextRoute()
    await expect(hit(route, rule.limit)).resolves.toBeUndefined()
  })

  it('throws 429 on the request past the limit', async () => {
    const route = nextRoute()
    await hit(route, rule.limit)
    await expect(enforceRateLimit(event, route, rule)).rejects.toMatchObject({ statusCode: 429 })
  })

  it('logs the first breach once, not on every later request', async () => {
    const route = nextRoute()
    await hit(route, rule.limit)
    await enforceRateLimit(event, route, rule).catch(() => {})
    await enforceRateLimit(event, route, rule).catch(() => {})
    expect(logSpy).toHaveBeenCalledTimes(1)
    expect(logSpy.mock.calls[0]?.[0]).toBe('Rate limit exceeded')
  })

  it('bans at limit x banMultiplier and keeps rejecting inside the window', async () => {
    const route = nextRoute()
    const attempts = rule.limit * config.rateLimit.banMultiplier
    for (let i = 0; i < attempts; i++) await enforceRateLimit(event, route, rule).catch(() => {})

    expect(logSpy.mock.calls.map((call) => call[0])).toContain('Rate limit ban')

    // The window would have reset by now, the ban outlives it.
    vi.advanceTimersByTime((rule.window + 1) * 1000)
    await expect(enforceRateLimit(event, route, rule)).rejects.toMatchObject({ statusCode: 429 })
  })

  it('lets a banned caller back in once the ban expires', async () => {
    const route = nextRoute()
    const attempts = rule.limit * config.rateLimit.banMultiplier
    for (let i = 0; i < attempts; i++) await enforceRateLimit(event, route, rule).catch(() => {})

    vi.advanceTimersByTime((config.rateLimit.banSeconds + 1) * 1000)
    await expect(enforceRateLimit(event, route, rule)).resolves.toBeUndefined()
  })

  it('resets the counter after the window', async () => {
    const route = nextRoute()
    await hit(route, rule.limit)
    vi.advanceTimersByTime((rule.window + 1) * 1000)
    await expect(hit(route, rule.limit)).resolves.toBeUndefined()
  })

  it('counts each IP separately', async () => {
    const route = nextRoute()
    await hit(route, rule.limit)
    await expect(enforceRateLimit({ ip: '198.51.100.7' }, route, rule)).resolves.toBeUndefined()
  })

  it('counts a signed-in user by id, not by IP', async () => {
    const route = nextRoute()
    session.user = { id: 'user-1' }
    await hit(route, rule.limit, { ip: '203.0.113.1' })
    // Same user, different IP: still over the limit.
    await expect(enforceRateLimit({ ip: '198.51.100.7' }, route, rule)).rejects.toMatchObject({
      statusCode: 429,
    })
  })
})
