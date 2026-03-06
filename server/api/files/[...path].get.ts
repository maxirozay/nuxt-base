export default defineEventHandler((event) => {
  const path = event.context.params?.path || ''
  return getFileStream(event, path)
})
