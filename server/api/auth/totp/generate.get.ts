import { generateSecret } from 'otplib'

export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  return { secret: generateSecret() }
})
