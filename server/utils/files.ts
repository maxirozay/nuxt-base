import { join, dirname } from 'path'
import { mkdir, readdir, unlink, writeFile, stat, rmdir } from 'fs/promises'
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsCommand,
} from '@aws-sdk/client-s3'
import { checkFileAccess } from '~~/server/database/access'

export async function uploadFile(event: any, file: any, path = 'files') {
  await checkFileAccess(event, path)
  const filename = file.filename
  path = getSecurePath(path)

  let url
  if (useS3()) {
    const s3Key = getS3Key(join(path, filename))
    url = await uploadToS3(s3Key, file.data, file.type || 'application/octet-stream')
  } else {
    const uploadFolder = join(process.cwd(), 'public', path)
    await mkdir(uploadFolder, { recursive: true })

    const savedPath = join(uploadFolder, filename)
    await writeFile(savedPath, file.data)

    url = join('/', path, filename)
  }
  return url
}

export async function deleteFile(event: any, path: string) {
  await checkFileAccess(event, path)
  path = getSecurePath(path)
  if (useS3()) await deleteFromS3(path)
  else {
    const relativePath = path.replace(/^\//, '')
    const localPath = join(process.cwd(), 'public', relativePath)
    await unlink(localPath)
    await deleteEmptyFolder(dirname(localPath))
  }
}

async function deleteEmptyFolder(directory: string) {
  try {
    const config = useRuntimeConfig()
    if (directory === join(process.cwd(), 'public', config.filesFolder)) return
    const files = await readdir(directory)
    if (files.length > 0) return

    await rmdir(directory)
    await deleteEmptyFolder(dirname(directory))
  } catch {}
}

export async function listFolder(event: any, path: string) {
  await checkFileAccess(event, path)
  path = getSecurePath(path)
  if (useS3()) return listFromS3(path)
  else {
    const relativePath = path.replace(/^\//, '')
    const localPath = join(process.cwd(), 'public', relativePath)
    const files = await readdir(localPath).catch(() => [])
    const fileStats = await Promise.all(
      files.map(async (name) => {
        const filePath = join(localPath, name)
        const stats = await stat(filePath)
        return {
          name,
          isFolder: stats.isDirectory(),
          size: stats.size,
          updatedAt: stats.mtime,
          url: join('/', relativePath, name),
        }
      }),
    )
    return fileStats
  }
}

export function getSecurePath(path: string) {
  const config = useRuntimeConfig()
  let normalizedPath = path.replace(/^\//g, '')
  if (normalizedPath.startsWith(config.filesFolder)) {
    normalizedPath = join('/', path)
  } else {
    normalizedPath = join('/', config.filesFolder, path)
  }
  if (normalizedPath.includes('..')) {
    throw createError({ statusCode: 400, message: 'Invalid path' })
  }
  return normalizedPath
}

// S3

let s3Client: S3Client | null = null

export const useS3 = () => {
  const config = useRuntimeConfig()

  if (!s3Client && config.s3.endpoint && config.s3.accessKeyId) {
    s3Client = new S3Client({
      region: config.s3.region,
      endpoint: config.s3.endpoint,
      credentials: {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
      },
      forcePathStyle: true,
    })
  }
  return s3Client
}

async function uploadToS3(key: string, body: Buffer, contentType: string, cache?: string) {
  const client = useS3()
  if (!client) return null

  const config = useRuntimeConfig()

  await client.send(
    new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cache || 'public, max-age=31536000',
      ACL: 'public-read',
    }),
  )

  return getS3URL(key)
}

async function deleteFromS3(path: string) {
  const client = useS3()
  if (!client) return

  const config = useRuntimeConfig()

  let key = getS3Key(path).replace(config.s3.publicUrl, '').replace(/^\//, '')

  await client.send(
    new DeleteObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
    }),
  )
}

async function listFromS3(path: string) {
  const client = useS3()
  if (!client) return

  const config = useRuntimeConfig()

  const response = await client.send(
    new ListObjectsCommand({
      Bucket: config.s3.bucket,
      Prefix: path,
    }),
  )
  return (
    response.Contents?.map((item) => ({
      name: item.Key?.substring(path.length) || '',
      isFolder: item.Key?.endsWith('/') || false,
      url: getS3URL(item.Key || ''),
      updatedAt: item.LastModified,
      size: item.Size || 0,
    })) || []
  )
}

function getS3Key(path: string) {
  const key = path.replace(/\\/g, '/')
  return key.startsWith('/') ? key.substring(1) : key
}

function getS3URL(path: string) {
  const config = useRuntimeConfig()
  return `${config.s3.publicUrl}/${config.s3.bucket}/${getS3Key(path)}`
}
