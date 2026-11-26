const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]);

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB upload limit
const TARGET_DIMENSION = 256;

export function isValidProfileImageUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('data:image/')) {
    return /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed);
  }
  try {
    const url = new URL(trimmed);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export async function processProfileImageFile(file: File): Promise<{
  dataUrl?: string;
  error?: string;
}> {
  if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
    return {
      error: 'Please choose a PNG, JPG, WEBP, or GIF image.',
    };
  }

  if (file.size > MAX_FILE_BYTES) {
    return {
      error: 'Image file must be 2 MB or smaller.',
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => {
      resolve({ error: 'Could not read the selected image file.' });
    };
    reader.onload = () => {
      const rawDataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!rawDataUrl) {
        resolve({ error: 'Selected image could not be decoded.' });
        return;
      }

      const img = new Image();
      img.onerror = () => {
        resolve({ error: 'Selected file is not a valid image.' });
      };
      img.onload = () => {
        try {
          const side = Math.min(img.width || TARGET_DIMENSION, img.height || TARGET_DIMENSION);
          const sx = Math.max(0, ((img.width || side) - side) / 2);
          const sy = Math.max(0, ((img.height || side) - side) / 2);

          const canvas = document.createElement('canvas');
          canvas.width = TARGET_DIMENSION;
          canvas.height = TARGET_DIMENSION;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ dataUrl: rawDataUrl });
            return;
          }

          ctx.drawImage(img, sx, sy, side, side, 0, 0, TARGET_DIMENSION, TARGET_DIMENSION);
          const compressed = canvas.toDataURL('image/webp', 0.86);
          if (compressed.startsWith('data:image/')) {
            resolve({ dataUrl: compressed });
          } else {
            resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.85) });
          }
        } catch {
          resolve({ dataUrl: rawDataUrl });
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}
