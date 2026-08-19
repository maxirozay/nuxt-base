import { z } from 'zod'

const bodySchema = z.object({
  email: emailSchema,
  password: z.string().min(12),
})

export default defineEventHandler(async (event) => {
  if (useRuntimeConfig().forceMfa) {
    throw createError({
      status: 401,
      message: 'MFA required',
    })
  }

  const { email, password } = await readValidatedBody(event, bodySchema.parse)

  const user = await getAuth(event, email, true)

  if (user.password && (await verifyPassword(user.password, password))) {
    if (user.totp) {
      throw createError({
        status: 401,
        message: 'TOTP required',
      })
    }
    const config = useRuntimeConfig()
    const hasMfa = user.totp || (user.credentials?.length ?? 0) > 0
    if (config.forceMfa && !hasMfa) {
      return setSession(event, { ...user, requiresMfaSetup: true })
    }
    return setSession(event, user)
  }

  throw createError({
    status: 401,
    message: 'Bad credentials',
  })
})
