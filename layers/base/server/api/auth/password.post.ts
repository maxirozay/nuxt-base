import { z } from 'zod'

function badCredentials() {
  return createError({
    status: 401,
    message: 'Bad credentials',
  })
}

export default defineEventHandler(async (event) => {
  const { email, password } = await readValidatedBody(
    event,
    z.object({
      email: emailSchema,
      password: passwordSchema(),
    }).parse,
  )

  const user = await getAuth(event, email).catch((error: any) => {
    if (error?.statusCode === 404) return null
    throw error
  })

  if (!user?.password) {
    // Burn comparable time so the timing does not leak what the status hides.
    await hashPassword(password)
    throw badCredentials()
  }

  if (!(await verifyPassword(user.password, password))) {
    throw badCredentials()
  }

  if (user.totp) {
    throw createError({
      status: 401,
      message: 'TOTP required',
    })
  }

  return setSession(event, user)
})
