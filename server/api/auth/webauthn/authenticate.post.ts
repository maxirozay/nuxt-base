import { eq } from "drizzle-orm"
import { auth, credentials } from "~~/server/database/schema"

export default defineWebAuthnAuthenticateEventHandler({
  async storeChallenge(event, challenge, attemptId) {
    await useStorage('auth').setItem(`attempt:${attemptId}`, challenge)
  },
  async getChallenge(event, attemptId) {
    const challenge = await useStorage('auth').getItem(`attempt:${attemptId}`)

    await useStorage('auth').removeItem(`attempt:${attemptId}`)

    if (!challenge)
      throw createError({ statusCode: 400, message: 'Challenge expired' })

    return challenge as string
  },
  async allowCredentials(event, userName) {
    const user = await getUser(userName)
    return await db.select().from(credentials).where(eq(credentials.userId, user.id))
  },
  async getCredential(event, credentialId) {
    const result = await db.select().from(credentials).where(eq(credentials.id, credentialId))
    const credential = result[0]

    if (!credential)
      throw createError({ statusCode: 400, message: 'Credential not found' });

    return credential
  },
  async onSuccess(event, { credential }) {
    const user = await db.select().from(auth).where(eq(auth.id, credential.userId as string))
      .then(result => result[0])
    await setSession(event, user!)
  },
})
