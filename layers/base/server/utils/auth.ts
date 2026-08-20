import { auth, refreshTokens } from '#server/database/schema'
import { eq, lte } from 'drizzle-orm'
import { randomBytes } from 'crypto'
import type { H3Event } from 'h3'

type AuthUser = typeof auth.$inferSelect
type SessionUser = Pick<AuthUser, 'id'> & Partial<Pick<AuthUser, 'email' | 'role'>>

export async function mfaSetupFlag(user: SessionUser) {
  const config = useRuntimeConfig()
  if (!config.forceMfa || !user.email) return

  const row = await db.query.auth.findFirst({
    where: { id: user.id },
    with: { credentials: true },
  })
  return { requiresMfaSetup: !row?.totp && !row?.credentials.length }
}

export async function createAuth(user: Pick<AuthUser, 'email'>) {
  const insertedUsers = await db
    .insert(auth)
    .values({
      email: user.email?.trim().toLowerCase(),
    })
    .returning()
  if (!insertedUsers[0]) {
    throw createError({
      status: 500,
      message: 'User creation failed',
    })
  }
  return insertedUsers[0]
}

export async function setAuth(user: Pick<AuthUser, 'id' | 'email'>) {
  const insertedUsers = await db
    .update(auth)
    .set({
      email: user.email?.trim().toLowerCase(),
    })
    .where(eq(auth.id, user.id))
    .returning()
  if (!insertedUsers[0]) {
    throw createError({
      status: 500,
      message: 'User update failed',
    })
  }
  return insertedUsers[0]
}

export async function getAuth(event: H3Event, email?: string, credentials = false) {
  const id = email ? undefined : (await getUserSession(event)).user?.id
  // an undefined filter is dropped by drizzle, which would match an arbitrary user
  if (!email && !id) {
    throw createError({
      status: 401,
      message: 'Not authenticated',
    })
  }

  const where = email ? { email: email.trim().toLowerCase() } : { id }
  const user = await db.query.auth.findFirst({
    where,
    with: {
      credentials,
    },
  })
  if (!user) {
    throw createError({
      status: 404,
      message: 'User not found',
    })
  }
  return user
}

export async function setSession(event: H3Event, user: SessionUser, refresh = true) {
  if (refresh) {
    const existingToken = getCookie(event, 'refresh_token')
    if (existingToken) {
      await revokeRefreshToken(existingToken)
    }
    await createRefreshToken(user.id, event)
  }

  // refresh === false means we are only rebuilding the session payload, not proving a
  // credential, so carry the stamp over instead of restarting it. Defaulting to 0 also
  // covers the middleware restoring a session from the refresh_token cookie: that path
  // proves nothing, so it must not unlock the sensitive actions below.
  const authenticatedAt = refresh
    ? Date.now()
    : ((await getUserSession(event)).authenticatedAt ?? 0)

  // replace, not set: setUserSession merges with defu, so an absent
  // requiresMfaSetup would never clear a previously flagged session
  return replaceUserSession(event, {
    user: {
      id: user.id,
      email: user.email?.trim().toLowerCase() ?? undefined,
      role: user.role || 'user',
      isAnonymous: !user.email,
      ...(await mfaSetupFlag(user)),
    },
    authenticatedAt,
    expiresAt: Date.now() + useRuntimeConfig().session.maxAge * 1000,
  })
}

/**
 * Gate for sensitive actions (setting a password, adding or removing a second factor,
 * changing the email address): the caller must have proven a credential recently, not
 * merely hold a session cookie.
 *
 * The stamp lives in the sealed session cookie rather than in a column on auth.users
 * on purpose: a column is per user, so a signin on any device would make every other
 * session count as fresh, including a stolen one.
 */
export async function requireRecentAuth(event: H3Event) {
  const session = await requireUserSession(event)

  // an anonymous user has no credential to prove and no way through AuthCheck: the
  // cookie is the whole account, so a freshness check would only lock them out
  if (session.user.isAnonymous) return session

  const maxAge = useRuntimeConfig().recentAuth.maxAge * 1000
  if (!session.authenticatedAt || Date.now() - session.authenticatedAt > maxAge) {
    throw createError({
      status: 403,
      statusMessage: 'reauth_required',
      message: 'Please verify your identity again to continue.',
    })
  }

  return session
}

export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url')
}

export async function createRefreshToken(userId: string, event: H3Event) {
  const token = generateRefreshToken()

  await db.insert(refreshTokens).values({
    userId,
    token,
  })

  const config = useRuntimeConfig()
  setCookie(event, 'refresh_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: config.refreshToken.maxAge,
    path: '/',
  })
  return token
}

export async function verifyRefreshToken(event: H3Event) {
  const existingToken = getCookie(event, 'refresh_token')
  if (!existingToken) {
    throw createError({
      status: 401,
      message: 'No token provided',
    })
  }

  const refreshToken = await db.query.refreshTokens.findFirst({ where: { token: existingToken } })
  if (!refreshToken) {
    deleteCookie(event, 'refresh_token')
    throw createError({
      status: 401,
      message: 'No token found',
    })
  }

  const user = await db.query.auth.findFirst({
    where: { id: refreshToken.userId },
  })
  if (!user) {
    deleteCookie(event, 'refresh_token')
    throw createError({
      status: 401,
      message: 'No user found',
    })
  }

  const config = useRuntimeConfig()
  const createdAt = refreshToken.createdAt.getTime()
  const creationExpiredAt = Date.now() - config.refreshToken.maxAge * 1000

  if (createdAt < creationExpiredAt) {
    await revokeExpiredRefreshToken(new Date(creationExpiredAt))
    deleteCookie(event, 'refresh_token')
    throw createError({
      status: 401,
      message: 'Token expired',
    })
  }

  return { refreshToken, user }
}

export async function revokeRefreshToken(token: string) {
  await db.delete(refreshTokens).where(eq(refreshTokens.token, token))
}

export async function revokeExpiredRefreshToken(creationExpiredAt: Date) {
  await db.delete(refreshTokens).where(lte(refreshTokens.createdAt, creationExpiredAt))
}

export async function revokeAllUserTokens(userId: string) {
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId))
}
