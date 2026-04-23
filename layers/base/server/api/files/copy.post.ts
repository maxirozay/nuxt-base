import { z } from 'zod'

const bodySchema = z.object({
  src: z.string().min(1),
  dest: z.string().min(1),
  isPrivate: z.boolean().optional(),
  deleteSrc: z.boolean().optional(),
  isFolder: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const {
    src,
    dest,
    isPrivate,
    deleteSrc,
    isFolder = !src.includes('.'),
  } = await readValidatedBody(event, bodySchema.parse)
  if (isFolder) await copyFiles(event, src, dest, isPrivate, deleteSrc)
  else await copyFile(event, src, dest, isPrivate, deleteSrc)
  return { success: true }
})
