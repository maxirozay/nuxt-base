import { z } from 'zod'

const bodySchema = z.object({
  email: z.email(),
  password: z.string().min(12),
})

export default defineEventHandler(async (event) => {
  const { email, password } = await readValidatedBody(event, bodySchema.parse)

  const user = await getAuth(event, email)

  if (user.password && (await verifyPassword(user.password, password))) {
    if (user.totp) {
      throw createError({
        status: 401,
        message: 'TOTP required',
      })
    }
    return setSession(event, user)
  }

  throw createError({
    status: 401,
    message: 'Bad credentials',
  })
})
