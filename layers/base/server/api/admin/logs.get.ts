import z from 'zod'

const querySchema = z.object({
  from: z.iso.datetime(),
  to: z.iso.datetime(),
  search: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { from, to, search } = querySchema.parse(query)
  const text = prepareStringForSearch(search)

  return db.query.logs.findMany({
    where: {
      time: {
        gte: new Date(from),
        lte: new Date(to),
      },
      OR: [
        { summary: search ? { ilike: text } : undefined },
        { type: search ? { ilike: text } : undefined },
      ],
    },
    orderBy: {
      time: 'desc',
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
