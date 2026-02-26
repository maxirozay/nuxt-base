import { join } from 'path'
import { mkdir, readdir, unlink, writeFile, stat } from 'fs/promises'
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsCommand,
} from '@aws-sdk/client-s3'

export async function uploadFile(event: any, file: any, folder = 'files') {
  await checkStorageAccess(event, folder)
  const filename = file.filename

  let url
  if (useS3()) {
    const s3Key = getS3Key(join(folder, filename))
    url = await uploadToS3(s3Key, file.data, file.type || 'application/octet-stream')
  } else {
    const uploadFolder = join(process.cwd(), 'public', folder)
    await mkdir(uploadFolder, { recursive: true })

    const savedPath = join(uploadFolder, filename)
    await writeFile(savedPath, file.data)

    url = join('/', folder, filename)
  }
  return url
}

export async function deleteFile(event: any, path: string) {
  await checkStorageAccess(event, path)
  if (useS3()) await deleteFromS3(path)
  else {
    const relativePath = path.replace(/^\//, '')
    const localPath = join(process.cwd(), 'public', relativePath)
    await unlink(localPath)
  }
}

export async function listFolder(event: any, path: string) {
  await checkStorageAccess(event, path)
  if (useS3()) return listFromS3(path)
  else {
    const relativePath = path.replace(/^\//, '')
    const localPath = join(process.cwd(), 'public', relativePath)
    const files = await readdir(localPath)
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

async function checkStorageAccess(event: any, path: string) {
  const user = event.context.user
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const root = `u/${user.id}`
  if (path.startsWith(root) && (root[root.length] === '/' || path.length === root.length)) {
    return true
  }

  if (path.startsWith('o/')) {
    const orgId = path.substring(2).replace(/\/.*/, '')
    const membership = await db.query.organizationMembers.findFirst({
      where: {
        userId: user.id,
        organizationId: orgId,
      },
    })
    if (membership?.role === 'admin') return true
  } else if (user.role === 'admin') return true

  throw createError({ statusCode: 403, message: 'Insufficient permissions' })
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
