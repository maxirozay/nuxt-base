import { z } from 'zod'
import { credentials } from '#server/database/schema'

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
    const parsed = z
      .object({
        userName: emailSchema,
      })
      .safeParse(userBody)

    if (!parsed.success || !session.user?.email || session.user.email !== parsed.data.userName) {
      throw createError({ status: 400, message: 'Email incorrect' })
    }

    return parsed.data
  },
  async onSuccess(event, { credential }) {
    const session = await requireUserSession(event)
    await db.insert(credentials).values({
      name: new Date().toISOString().substring(0, 10),
      userId: session.user.id,
      id: credential.id,
      publicKey: credential.publicKey,
      counter: credential.counter,
      backedUp: credential.backedUp,
      transports: credential.transports as any[],
    })
    if (session.user?.requiresMfaSetup) {
      await setSession(event, {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
      })
    }
  },
})
