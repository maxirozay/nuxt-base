import z from 'zod'

const querySchema = z.object({
  from: z.iso.datetime(),
  to: z.iso.datetime(),
  type: z.string(),
})

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { from, to, type } = querySchema.parse(query)

  return db.query.logs.findMany({
    where: {
      timestamp: {
        gte: new Date(from),
        lte: new Date(to),
      },
      type: type !== 'all' ? type : undefined,
    },
    orderBy: {
      timestamp: 'desc',
    },
    with: {
      auth: {
        columns: {
          email: true,
        },
      },
    },
  })
})
