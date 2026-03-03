import { auth } from '#server/database/schema'
import { setSession } from '#server/utils/auth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
  if (session?.user || !config.public.anonymousSignup) {
    throw createError({
      status: 403,
      message: 'Anonymous signup not allowed',
    })
  }

  const insertedUsers = await db.insert(auth).values({}).returning()

  if (!insertedUsers[0]) {
    throw createError({
      status: 500,
      message: 'Anonymous user creation failed',
    })
  }

  const user = insertedUsers[0]

  return setSession(event, user)
})
