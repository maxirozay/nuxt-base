export default defineEventHandler((event) => {
  const path = event.context.params?.path || ''
  return getFile(event, decodeURIComponent(path))
})
