import { z } from 'zod'
import { credentials } from '~~/server/database/schema'

export default defineWebAuthnRegisterEventHandler({
  async storeChallenge(event, challenge, attemptId) {
    await useStorage('auth').setItem(`attempt:${attemptId}`, challenge)
  },
  async getChallenge(event, attemptId) {
    const challenge = await useStorage('auth').getItem(`attempt:${attemptId}`)

    await useStorage('auth').removeItem(`attempt:${attemptId}`)

    if (!challenge) throw createError({ statusCode: 400, message: 'Challenge expired' })

    return challenge as string
  },
  async validateUser(userBody, event) {
    const session = await requireUserSession(event)
    if (session.user?.email && session.user.email !== userBody.userName) {
      throw createError({ statusCode: 400, message: 'Email not matching curent session' })
    }

    return z
      .object({
        userName: z.email(),
      })
      .parse(userBody)
  },
  async onSuccess(event, { credential, user }) {
    const dbUser = await getUser(user.userName)
    await db.insert(credentials).values({
      ...credential,
      userId: dbUser.id,
      transports: credential.transports ?? [],
    })
    await setSession(event, dbUser)
  },
})
