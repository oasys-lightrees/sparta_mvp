// Shared client-side image-upload constraints. Mirror the backend
// (upload.service.ts) so bad files are rejected before hitting the network; the
// server always re-validates.

export const ACCEPTED_IMAGE_TYPES = [
  'image/png',
  'image/svg+xml',
  'image/jpeg',
  'image/webp',
];
export const ACCEPT_ATTR = '.png,.svg,.jpg,.jpeg,.webp';
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

// An uploaded (vs. externally hosted) asset is served from our own route.
export const isUploadedAsset = (url: string): boolean => /\/api\/uploads\//.test(url);

/** Returns a user-facing error message, or null when the file is acceptable. */
export const validateImageFile = (file: File): string | null => {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Unsupported format. Use PNG, SVG, JPG, JPEG or WEBP.';
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return 'Image is too large. The maximum size is 5 MB.';
  }
  return null;
};
