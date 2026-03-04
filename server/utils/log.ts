import { logs } from '../database/schema'

export async function logEvent(event: any, info?: string, type?: string) {
  const userId = event.context.user?.id || null
  const ipAddress = event.node.req.headers['x-forwarded-for'] || event.node.req.socket.remoteAddress
  const userAgent = event.node.req.headers['user-agent']

  await db.insert(logs).values({
    userId,
    path: event.path,
    method: event.node.req.method,
    ipAddress,
    userAgent,
    info,
    type,
  })
}
