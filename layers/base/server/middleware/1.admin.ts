export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/api/admin/')) return
  await isAdmin(event)
})
