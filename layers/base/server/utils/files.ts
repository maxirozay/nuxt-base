import { join, dirname } from 'path'
import { mkdir, readdir, unlink, writeFile, stat, rmdir } from 'fs/promises'
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { checkFileAccess } from '#server/database/access'
import { createReadStream } from 'fs'

export async function uploadFile(event: any, file: any, path = 'files', isPrivate = true) {
  await checkFileAccess(event, path)
  const filename = file.filename
  path = getSecurePath(path, isPrivate)

  let url
  if (useS3()) {
    const s3Key = getS3Key(join(path, filename))
    url = await uploadToS3(
      s3Key,
      file.data,
      file.type || 'application/octet-stream',
      undefined,
      isPrivate,
    )
  } else {
    const uploadFolder = join(process.cwd(), path)
    await mkdir(uploadFolder, { recursive: true })

    const savedPath = join(uploadFolder, filename)
    await writeFile(savedPath, file.data)

    url = getFileURL(join('/', path, filename), isPrivate)
  }
  return url
}

export function getFileURL(path: string, isPrivate = true) {
  let url = getPathWithoutRoot(path, isPrivate)

  if (isPrivate) {
    url = join('/', 'api/files', url) + '?isPrivate=true'
    return useRuntimeConfig().public.url + url
  }
  return useRuntimeConfig().public.filesUrl + url
}

function getPathWithoutRoot(path: string, isPrivate = true) {
  const config = useRuntimeConfig()
  const root = isPrivate ? config.filesPrivateFolder : config.filesPublicFolder
  return path.substring(root.length + 1)
}

export async function getFile(event: any, path: string, isPrivate = false, maxAge?: number) {
  await checkFileAccess(event, path)
  const config = useRuntimeConfig()
  path = getSecurePath(path, isPrivate)

  if (useS3()) {
    let url
    if (isPrivate) {
      url = await getS3SignedUrl(getS3Key(path), maxAge)
    } else {
      url = config.public.filesUrl + '/' + path
    }

    const response = await fetch(url)
    if (!response.ok) throw createError({ statusCode: 502, message: 'Failed to fetch image' })

    const contentType = response.headers.get('content-type') ?? 'image/webp'
    setHeader(event, 'Content-Type', contentType)
    return response.body
  }

  const fullPath = join(process.cwd(), path)

  const stats = await stat(fullPath)
  if (!stats.isFile()) {
    throw createError({ statusCode: 404, message: 'File not found' })
  }

  return createReadStream(fullPath)
}

export async function deleteFile(event: any, path: string, isPrivate = true) {
  await checkFileAccess(event, path)
  path = getSecurePath(path, isPrivate)
  if (useS3()) await deleteFromS3(path, isPrivate)
  else {
    const localPath = join(process.cwd(), path)
    await unlink(localPath)
    const config = useRuntimeConfig()
    const root = isPrivate ? config.filesPrivateFolder : config.filesPublicFolder
    await deleteEmptyFolder(dirname(localPath), root)
  }
}

async function deleteEmptyFolder(directory: string, root: string) {
  try {
    if (directory === join(process.cwd(), root)) return
    const files = await readdir(directory)
    if (files.length > 0) return

    await rmdir(directory)
    await deleteEmptyFolder(dirname(directory), root)
  } catch {}
}

export async function listFolder(event: any, path: string, isPrivate = true) {
  await checkFileAccess(event, path)
  path = getSecurePath(path, isPrivate)
  if (useS3()) return listFromS3(path, isPrivate)
  else {
    const localPath = join(process.cwd(), path)
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
          url: getFileURL(join('/', path, name), isPrivate),
        }
      }),
    )
    return fileStats
  }
}

export function getSecurePath(path: string, isPrivate = true) {
  const config = useRuntimeConfig()
  const root = isPrivate ? config.filesPrivateFolder : config.filesPublicFolder
  let normalizedPath = path.replace(/^\//g, '')

  if (normalizedPath.startsWith(root)) {
    normalizedPath = join('/', path)
  } else {
    normalizedPath = join('/', root, path)
  }
  if (normalizedPath.includes('..')) {
    throw createError({ statusCode: 400, message: 'Invalid path' })
  }
  return normalizedPath.replace(/^\//, '')
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

export async function uploadToS3(
  key: string,
  body: Buffer,
  contentType: string,
  cache = 'public, max-age=31536000',
  isPrivate = true,
) {
  const client = useS3()
  if (!client) return null

  const config = useRuntimeConfig()

  if (isPrivate) {
    await client.send(
      new PutObjectCommand({
        Bucket: config.s3.privateBucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: cache || 'public, max-age=31536000',
      }),
    )

    return await getS3SignedUrl(key)
  }
  await client.send(
    new PutObjectCommand({
      Bucket: config.s3.publicBucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cache || 'public, max-age=31536000',
      ACL: 'public-read',
    }),
  )

  return getS3URL(key)
}

export async function deleteFromS3(path: string, isPrivate = true) {
  const client = useS3()
  if (!client) return

  const config = useRuntimeConfig()

  let key = getS3Key(path).replace(config.public.filesUrl, '').replace(/^\//, '')

  await client.send(
    new DeleteObjectCommand({
      Bucket: isPrivate ? config.s3.privateBucket : config.s3.publicBucket,
      Key: key,
    }),
  )
}

export async function listFromS3(path: string, isPrivate = true) {
  const client = useS3()
  if (!client) return []

  const config = useRuntimeConfig()

  const response = await client.send(
    new ListObjectsCommand({
      Bucket: isPrivate ? config.s3.privateBucket : config.s3.publicBucket,
      Prefix: path,
    }),
  )
  return await Promise.all(
    (response.Contents || []).map(async (item) => ({
      name: item.Key?.split('/').pop() || '',
      isFolder: item.Key?.endsWith('/') || false,
      url: isPrivate ? await getS3SignedUrl(item.Key || '') : getS3URL(item.Key || ''),
      updatedAt: item.LastModified,
      size: item.Size || 0,
    })),
  )
}

export function getS3Key(path: string) {
  const key = path.replace(/\\/g, '/')
  return key.startsWith('/') ? key.substring(1) : key
}

function getS3URL(path: string) {
  const config = useRuntimeConfig()
  return `${config.public.filesUrl}/${getS3Key(path)}`
}

async function getS3SignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const client = useS3()
  if (!client) return ''

  const config = useRuntimeConfig()

  const command = new GetObjectCommand({
    Bucket: config.s3.privateBucket,
    Key: getS3Key(key),
  })

  return await getSignedUrl(client, command, { expiresIn })
}
