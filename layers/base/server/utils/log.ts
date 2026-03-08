import { logs } from '#server/database/schema'

export async function log(event?: any, info?: string, type?: string) {
  const session = await getUserSession(event)
  const ipAddress =
    event?.node?.req?.headers['x-forwarded-for'] || event?.node?.req?.socket?.remoteAddress
  const userAgent = event?.node?.req?.headers['user-agent']

  await db.insert(logs).values({
    userId: session?.user?.id,
    path: event?.path,
    method: event?.node?.req?.method,
    ipAddress,
    userAgent,
    info,
    type,
  })
}
