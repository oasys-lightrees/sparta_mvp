import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { HttpError } from '../utils/http-error';

/**
 * Local-disk image storage for mentor-uploaded landing-page assets.
 *
 * This is the platform's configured storage provider: files are written to
 * UPLOAD_DIR (a mounted volume in Docker, so they survive redeploys) and served
 * back over HTTP by the upload route. Nothing binary is ever stored in the
 * database — only the resulting URL is saved into the existing brand config.
 *
 * If an object store (S3/GCS) is introduced later, only this module and the
 * route's URL construction need to change; the config schema stays identical.
 */

// Allowed image types -> canonical file extension. SVG is accepted but served
// with a hardened, script-neutralizing response (see upload.routes.ts).
const TYPE_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

const EXT_TO_TYPE: Record<string, string> = {
  png: 'image/png',
  svg: 'image/svg+xml',
  jpg: 'image/jpeg',
  webp: 'image/webp',
};

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

// Stored file names are always `<uuid>.<ext>`; validate before touching disk so
// a crafted name can never escape UPLOAD_DIR (path traversal).
const NAME_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|svg|jpg|webp)$/;

const uploadDir = (): string =>
  process.env.UPLOAD_DIR ?? path.resolve(process.cwd(), 'uploads');

/**
 * Validate and persist an uploaded image. Returns the generated file name
 * (`<uuid>.<ext>`), which the caller turns into a public URL.
 */
export const storeImage = async (file: File): Promise<string> => {
  const ext = TYPE_TO_EXT[file.type];
  if (!ext) {
    throw new HttpError(
      400,
      'Unsupported image type. Use PNG, SVG, JPG, JPEG or WEBP.',
    );
  }
  if (file.size <= 0) {
    throw new HttpError(400, 'The uploaded file is empty.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new HttpError(400, 'Image is too large. The maximum size is 5 MB.');
  }

  const dir = uploadDir();
  await mkdir(dir, { recursive: true });

  const name = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, name), buffer);

  return name;
};

/**
 * Read a stored image by name. Returns null when the name is malformed or the
 * file is missing, so the route can answer 404 without leaking disk errors.
 */
export const readImage = async (
  name: string,
): Promise<{ body: Buffer; contentType: string } | null> => {
  if (!NAME_REGEX.test(name)) return null;

  const ext = name.slice(name.lastIndexOf('.') + 1);
  const contentType = EXT_TO_TYPE[ext];
  if (!contentType) return null;

  try {
    const body = await readFile(path.join(uploadDir(), name));
    return { body, contentType };
  } catch {
    return null;
  }
};
