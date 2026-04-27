import { join, dirname, basename } from 'path'
import {
  mkdir,
  readdir,
  writeFile,
  stat,
  rm,
  appendFile,
  readFile as fsReadFile,
} from 'fs/promises'
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  CopyObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
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

export async function uploadChunk(
  event: any,
  {
    uploadId,
    chunkIndex,
    totalChunks,
    filename,
    type,
    chunk,
    path,
    isPrivate,
    parts,
  }: {
    uploadId?: string
    chunkIndex: number
    totalChunks: number
    filename: string
    type: string
    chunk: Buffer
    path: string
    isPrivate: boolean
    parts: any[]
  },
) {
  if (chunkIndex < 0 || chunkIndex >= totalChunks || totalChunks < 1) {
    throw createError({ statusCode: 400, message: 'Invalid chunk index' })
  }

  await checkFileAccess(event, path)
  path = getSecurePath(path, isPrivate)
  if (filename && !/[^/]\.[^.]+$/.test(path)) {
    path = join(path, filename)
  }

  if (useS3()) {
    if (!uploadId) {
      uploadId = (await initMultipartUploadToS3(getS3Key(path), type, isPrivate))!
      parts = []
    }

    if (parts.length < totalChunks) {
      const part = await uploadPartToS3(getS3Key(path), chunk, uploadId, chunkIndex + 1, isPrivate)
      parts.push(part)
      if (parts.length < totalChunks) {
        return { uploadId, parts }
      }
    }

    return completeMultipartUploadToS3(getS3Key(path), uploadId, parts, isPrivate)
  }

  if (!uploadId) {
    uploadId = crypto.randomUUID()
    parts = []
  }

  const tmpDir = join(process.cwd(), 'files', 'temp', uploadId)
  await mkdir(tmpDir, { recursive: true })
  await writeFile(join(tmpDir, String(chunkIndex)), chunk)

  const receivedChunks = await readdir(tmpDir)
  if (receivedChunks.length < totalChunks) {
    parts = receivedChunks.map((_file, index) => ({
      PartNumber: index + 1,
    }))
    return { uploadId, parts }
  }

  const safeFilename = basename(filename)
  const securePath = getSecurePath(path, isPrivate)
  const filePath = join(securePath, safeFilename)

  const fullPath = join(process.cwd(), filePath)
  await mkdir(dirname(fullPath), { recursive: true })
  for (let i = 0; i < totalChunks; i++) {
    const data = await fsReadFile(join(tmpDir, String(i)))
    if (i === 0) await writeFile(fullPath, data)
    else await appendFile(fullPath, data)
  }
  await rm(tmpDir, { recursive: true, force: true })

  return getFileURL(filePath, isPrivate)
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
      url = config.public.files.url + '/' + path
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

    return getS3SignedUrl(key)
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

export async function initMultipartUploadToS3(key: string, contentType: string, isPrivate = true) {
  const client = useS3()
  if (!client) return null

  const config = useRuntimeConfig()

  const command = new CreateMultipartUploadCommand({
    Bucket: isPrivate ? config.s3.privateBucket : config.s3.publicBucket,
    Key: key,
    ContentType: contentType,
    ACL: isPrivate ? undefined : 'public-read',
  })

  const { UploadId } = await client.send(command)
  return UploadId
}

export async function uploadPartToS3(
  key: string,
  body: Buffer,
  uploadId: string,
  partNumber: number,
  isPrivate = true,
) {
  const client = useS3()
  if (!client) return null

  const config = useRuntimeConfig()

  const response = await client.send(
    new UploadPartCommand({
      Bucket: isPrivate ? config.s3.privateBucket : config.s3.publicBucket,
      Key: key,
      Body: body,
      UploadId: uploadId,
      PartNumber: partNumber,
    }),
  )

  return { ETag: response.ETag, PartNumber: partNumber }
}

export async function completeMultipartUploadToS3(
  key: string,
  uploadId: string,
  parts: any[],
  isPrivate = true,
) {
  const client = useS3()
  if (!client) return null

  const config = useRuntimeConfig()

  const command = new CompleteMultipartUploadCommand({
    Bucket: isPrivate ? config.s3.privateBucket : config.s3.publicBucket,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts,
    },
  })

  await client.send(command)
  return isPrivate ? getS3SignedUrl(key) : getS3URL(key)
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
  return `${config.public.files.url}/${getS3Key(path)}`
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
