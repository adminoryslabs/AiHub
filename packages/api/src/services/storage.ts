// Servicio de almacenamiento: Cloudflare R2 compatible con S3 API
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import path from 'path';

let s3Client: S3Client;

function getS3Client(): S3Client {
  if (!s3Client) {
    const accountId = process.env.R2_ACCOUNT_ID;
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      },
    });
  }
  return s3Client;
}

// Tipos MIME permitidos para imágenes
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

// Mapa de MIME type a extensión
const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  mime_type: string;
}

// Subir imagen a R2
export async function uploadImage(
  buffer: Buffer,
  mimeType: string,
  originalName: string
): Promise<UploadResult> {
  // Validar tipo MIME
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`Tipo de archivo no permitido: ${mimeType}`);
  }

  const s3 = getS3Client();
  const bucket = process.env.R2_BUCKET || 'aihub-images';
  const publicUrl = process.env.R2_PUBLIC_URL || '';

  // Generar clave con estructura articles/año/mes/uuid.ext
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const ext = MIME_TO_EXT[mimeType] || path.extname(originalName).replace('.', '');
  const uuid = randomUUID();
  const key = `articles/${year}/${month}/${uuid}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: 'public, max-age=31536000',
    })
  );

  return {
    url: `${publicUrl}/${key}`,
    key,
    size: buffer.length,
    mime_type: mimeType,
  };
}
