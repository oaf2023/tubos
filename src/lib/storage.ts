import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'public', 'uploads')
const S3_ENABLED = !!process.env.S3_BUCKET && !!process.env.S3_ENDPOINT

export interface StoredFile {
  url: string
  key: string
  bucket: 'local' | 's3'
}

function getExtension(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'application/pdf': 'pdf',
  }
  return map[mime] || 'bin'
}

export async function storeFile(
  buffer: Buffer,
  mime: string,
  subdir = 'general',
): Promise<StoredFile> {
  const ext = getExtension(mime)
  const key = `${subdir}/${randomUUID()}.${ext}`

  if (S3_ENABLED) {
    const { PutObjectCommand, S3Client } = await import('@aws-sdk/client-s3')
    const client = new S3Client({
      endpoint: process.env.S3_ENDPOINT!,
      region: process.env.S3_REGION || 'auto',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
      forcePathStyle: true,
    })

    await client.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: mime,
    }))

    const publicUrl = process.env.S3_PUBLIC_URL
      ? `${process.env.S3_PUBLIC_URL}/${key}`
      : `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${key}`

    return { url: publicUrl, key, bucket: 's3' }
  }

  // Local filesystem fallback
  const dir = join(UPLOAD_DIR, subdir)
  await mkdir(dir, { recursive: true })
  const filePath = join(dir, `${randomUUID()}.${ext}`)
  await writeFile(filePath, buffer)

  const url = `/uploads/${key}`
  return { url, key, bucket: 'local' }
}

export function base64ToBuffer(base64: string): Buffer {
  const raw = base64.replace(/^data:[^;]+;base64,/, '')
  return Buffer.from(raw, 'base64')
}
