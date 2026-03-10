import { auth } from '#server/database/schema'
import { eq, lte } from 'drizzle-orm'
import { randomBytes } from 'crypto'
import { refreshTokens } from '#server/database/schema'

export async function createAuthUser(user: any) {
  const insertedUsers = await db
    .insert(auth)
    .values({
      email: user.email,
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

export async function setAuthUser(user: any) {
  const insertedUsers = await db
    .update(auth)
    .set({
      email: user.email,
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

export async function getAuth(event: any, email?: string, credentials = false) {
  let where: any = { email }
  if (!email) {
    const session = await getUserSession(event)
    where = { id: session?.user?.id }
  }
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

export async function setSession(event: any, user: any, refresh = true) {
  if (refresh) {
    const existingToken = getCookie(event, 'refresh_token')
    if (existingToken) {
      await revokeRefreshToken(existingToken)
    }
    await createRefreshToken(user.id, event)
  }

  return setUserSession(event, {
    user: {
      id: user.id,
      email: user.email,
      role: user.role || 'user',
      isAnonymous: !user.email,
    },
    expiresAt: Date.now() + useRuntimeConfig().session.maxAge * 1000,
  })
}

export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url')
}

export async function createRefreshToken(userId: string, event: any) {
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

export async function verifyRefreshToken(event: any) {
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
