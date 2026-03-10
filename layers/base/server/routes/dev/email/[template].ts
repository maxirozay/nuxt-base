export default defineEventHandler(async (event) => {
  if (process.env.NODE_ENV === 'production') {
    throw createError({
      statusCode: 404,
      message: 'Not found',
    })
  }

  const templateId = event.context.params?.template || ''
  const query = getQuery(event)
  const locale = (query.locale as string) || 'en'

  const template = (await buildEmailTemplate(templateId, locale, query)).html
  return buildEmail(template, locale)
})
