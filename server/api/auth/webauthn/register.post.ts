import { z } from 'zod'
import { credentials } from '~~/server/database/schema'

export default defineWebAuthnRegisterEventHandler({
  async storeChallenge(event, challenge, attemptId) {
    await useStorage('auth').setItem(`attempt:${attemptId}`, challenge)
  },
  async getChallenge(event, attemptId) {
    const challenge = await useStorage('auth').getItem(`attempt:${attemptId}`)

    await useStorage('auth').removeItem(`attempt:${attemptId}`)

    if (!challenge) throw createError({ status: 400, message: 'Challenge expired' })

    return challenge as string
  },
  async validateUser(userBody, event) {
    const session = await requireUserSession(event)
    if (session.user?.email && session.user.email !== userBody.userName) {
      throw createError({ status: 400, message: 'Email not matching curent session' })
    }

    return z
      .object({
        userName: z.email(),
      })
      .parse(userBody)
  },
  async onSuccess(event, { credential, user }) {
    const dbUser = await getAuth(user.userName)
    await db.insert(credentials).values({
      name: new Date().toISOString().substring(0, 10),
      userId: dbUser.id,
      id: credential.id,
      publicKey: credential.publicKey,
      counter: credential.counter,
      backedUp: credential.backedUp,
      transports: credential.transports as any[],
    })
    await setSession(event, dbUser)
  },
})
