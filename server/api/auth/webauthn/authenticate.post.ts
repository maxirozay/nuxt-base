import { eq } from 'drizzle-orm'
import { auth } from '~~/server/database/schema'

export default defineWebAuthnAuthenticateEventHandler({
  async storeChallenge(event, challenge, attemptId) {
    await useStorage('auth').setItem(`attempt:${attemptId}`, challenge)
  },
  async getChallenge(event, attemptId) {
    const challenge = await useStorage('auth').getItem(`attempt:${attemptId}`)

    await useStorage('auth').removeItem(`attempt:${attemptId}`)

    if (!challenge) throw createError({ status: 400, message: 'Challenge expired' })

    return challenge as string
  },
  async allowCredentials(event, userName) {
    const user = await getAuth(userName, true)
    return user.credentials as any[]
  },
  async getCredential(event, credentialId) {
    const credential = await db.query.credentials.findFirst({
      where: {
        id: credentialId,
      },
    })

    if (!credential) throw createError({ status: 400, message: 'Credential not found' })
    return credential as any
  },
  async onSuccess(event, { credential }) {
    const user = await db
      .select()
      .from(auth)
      .where(eq(auth.id, credential.userId as string))
      .then((result) => result[0])
    await setSession(event, user!)
  },
})
