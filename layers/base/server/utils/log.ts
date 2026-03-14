import { logs } from '#server/database/schema'
import { lt } from 'drizzle-orm/sql/expressions/conditions'

export async function log(
  summary: string,
  data?: any,
  origin?: string,
  type?: string,
  event?: any,
) {
  const session = await getUserSession(event)
  const ipAddress =
    event?.node?.req?.headers['x-forwarded-for'] || event?.node?.req?.socket?.remoteAddress
  const userAgent = event?.node?.req?.headers['user-agent']

  await db.insert(logs).values({
    userId: session?.user?.id,
    type,
    origin: origin || event?.path + ' ' + event?.node?.req?.method,
    summary,
    data,
    ipAddress,
    userAgent,
  })
}

export async function cleanLogs() {
  const config = useRuntimeConfig()
  const retentionMS = daysToMilliseconds(config.logs.retentionDays)
  const cutoffDate = new Date(Date.now() - retentionMS)

  await db.delete(logs).where(lt(logs.time, cutoffDate))
}
