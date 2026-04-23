import { join, dirname } from 'path'
import { mkdir, readdir, writeFile, stat, rm } from 'fs/promises'
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { checkFileAccess } from '#server/database/access'
import { createReadStream } from 'fs'

export async function uploadFile(event: any, file: any, path = 'files', isPrivate = true) {
  await checkFileAccess(event, path)
  path = getSecurePath(path, isPrivate)
  if (file.filename && !/[^/]\.[^.]+$/.test(path)) {
    path = join(path, file.filename)
  }

  let url
  if (useS3()) {
    const s3Key = getS3Key(path)
    url = await uploadToS3(
      s3Key,
      file.data,
      file.type || 'application/octet-stream',
      undefined,
      isPrivate,
    )
  } else {
    const filePath = join(process.cwd(), path)
    const folderPath = filePath.replace(/\/[^/]*$/, '')
    await mkdir(folderPath, { recursive: true })
    await writeFile(filePath, file.data)

    url = getFileURL(path, isPrivate)
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

export async function deletePath(event: any, path: string, isPrivate = true) {
  await checkFileAccess(event, path)
  path = getSecurePath(path, isPrivate)
  if (useS3()) await deleteFromS3(path, isPrivate)
  else {
    const localPath = join(process.cwd(), path)
    await rm(localPath, { recursive: true, force: true })
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

    await rm(directory, { recursive: true })
    await deleteEmptyFolder(dirname(directory), root)
  } catch {}
}

type ListedFile = {
  name: string
  size: number
  updatedAt: Date
  path: string
  url: string
}

export async function listFolder(
  event: any,
  path: string,
  isPrivate = true,
): Promise<ListedFile[]> {
  await checkFileAccess(event, path)
  path = getSecurePath(path, isPrivate)

  if (useS3()) return await listFromS3(path, isPrivate)
  const localPath = join(process.cwd(), path)
  const filesStats = await readdir(localPath).catch(() => [])
  return (
    await Promise.all(
      filesStats.map(async (name) => {
        const localeFilePath = join(localPath, name)
        const stats = await stat(localeFilePath)
        const filePath = removeRoot(join(path, name), isPrivate)
        return stats.isDirectory()
          ? await listFolder(event, filePath, isPrivate)
          : {
              name,
              size: stats.size,
              updatedAt: stats.mtime,
              path: filePath,
              url: getFileURL(filePath, isPrivate),
            }
      }),
    )
  ).flat()
}

export async function copyFile(
  event: any,
  src: string,
  dest: string,
  isPrivate = true,
  deleteSrc = false,
) {
  await checkFileAccess(event, src)
  await checkFileAccess(event, dest)
  src = getSecurePath(src, isPrivate)
  dest = getSecurePath(dest, isPrivate)

  if (useS3()) return copyFromS3(src, dest, isPrivate, deleteSrc)

  const srcPath = join(process.cwd(), src)
  const destPath = join(process.cwd(), dest)
  await mkdir(dirname(destPath), { recursive: true })
  await writeFile(destPath, createReadStream(srcPath))

  if (deleteSrc) {
    await deletePath(event, removeRoot(src, isPrivate), isPrivate)
  }
}

export async function copyFiles(
  event: any,
  src: string,
  dest: string,
  isPrivate = true,
  deleteSrc = false,
) {
  const files = await listFolder(event, src, isPrivate)
  return Promise.all(
    files.map(async (file) =>
      copyFile(event, file.path, file.path.replace(src, dest), isPrivate, deleteSrc),
    ),
  )
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

export function removeRoot(path: string, isPrivate = true) {
  const config = useRuntimeConfig()
  const root = isPrivate ? config.filesPrivateFolder : config.filesPublicFolder
  return path.replace(new RegExp(`^${root}/?`), '')
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

  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: isPrivate ? config.s3.privateBucket : config.s3.publicBucket,
      Prefix: path,
    }),
  )
  return await Promise.all(
    (response.Contents || []).map(async (item) =>
      client.send(
        new DeleteObjectCommand({
          Bucket: isPrivate ? config.s3.privateBucket : config.s3.publicBucket,
          Key: item.Key,
        }),
      ),
    ),
  )
}

export async function listFromS3(path: string, isPrivate = true) {
  const client = useS3()
  if (!client) return []

  const config = useRuntimeConfig()

  let ContinuationToken
  const files = []
  do {
    const response: any = await client.send(
      new ListObjectsV2Command({
        Bucket: isPrivate ? config.s3.privateBucket : config.s3.publicBucket,
        Prefix: path,
        ContinuationToken,
      }),
    )
    ContinuationToken = response.NextContinuationToken
    files.push(
      ...(await Promise.all(
        (response.Contents || []).map(async (item: any) => ({
          path: removeRoot(item.Key || '', isPrivate),
          name: item.Key?.split('/').pop() || '',
          url: isPrivate ? await getS3SignedUrl(item.Key || '') : getS3URL(item.Key || ''),
          updatedAt: item.LastModified,
          size: item.Size || 0,
        })),
      )),
    )
  } while (ContinuationToken)

  return files
}

export async function copyFromS3(src: string, dest: string, isPrivate = true, deleteSrc = false) {
  const client = useS3()
  if (!client) return

  const config = useRuntimeConfig()
  const bucket = isPrivate ? config.s3.privateBucket : config.s3.publicBucket
  await client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      Key: dest,
      CopySource: `/${bucket}/${src}`,
    }),
  )
  if (deleteSrc) {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: src,
      }),
    )
  }
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
