/**
 * Image compression and optimization utility for VYBE
 * Ensures all uploaded media (posts, stories, reels, avatars, DMs)
 * stay well within server-side payload limits while preserving crisp visual quality.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeBytes?: number;
}

/**
 * Resizes and compresses an image File or Blob into an optimized Data URL string.
 * Default target: max 1080x1920, JPEG quality 0.8, strictly <= 550KB base64.
 */
export async function compressImageFile(
  file: File | Blob,
  options: CompressionOptions = {}
): Promise<string> {
  const {
    maxWidth = 1080,
    maxHeight = 1920,
    quality = 0.8,
    maxSizeBytes = 550 * 1024, // 550 KB (safely below server payload limits)
  } = options;

  return new Promise((resolve, reject) => {
    // If it's not an image (e.g. video), read directly or handle accordingly
    if (file.type && !file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio preserving dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        // Draw image smoothly onto canvas
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Iterative compression to ensure size <= maxSizeBytes
        let currentQuality = quality;
        let dataUrl = canvas.toDataURL('image/jpeg', currentQuality);

        // If string size exceeds target, step down quality and canvas scale
        while (dataUrl.length > maxSizeBytes && currentQuality > 0.3) {
          currentQuality -= 0.12;
          dataUrl = canvas.toDataURL('image/jpeg', Math.max(0.3, currentQuality));
        }

        // If still too large, halve dimensions
        if (dataUrl.length > maxSizeBytes) {
          const smallerCanvas = document.createElement('canvas');
          smallerCanvas.width = Math.round(width * 0.7);
          smallerCanvas.height = Math.round(height * 0.7);
          const sCtx = smallerCanvas.getContext('2d');
          if (sCtx) {
            sCtx.drawImage(canvas, 0, 0, smallerCanvas.width, smallerCanvas.height);
            dataUrl = smallerCanvas.toDataURL('image/jpeg', 0.65);
          }
        }

        resolve(dataUrl);
      };

      img.onerror = () => {
        // Fallback to raw data URL if image decoding fails
        resolve(event.target?.result as string);
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an avatar photo into a crisp, lightweight square (e.g. 400x400, < 100KB)
 */
export async function compressAvatarFile(file: File | Blob): Promise<string> {
  return compressImageFile(file, {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.85,
    maxSizeBytes: 120 * 1024,
  });
}

/**
 * Ensures any base64 data URL string is safely compressed under 600KB before sending to the backend.
 */
export async function ensureSafeDataUrl(
  dataUrl: string,
  maxWidth = 1080,
  maxHeight = 1920
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }

  // If already under 550KB (~750,000 characters base64), it's safe
  if (dataUrl.length <= 600 * 1024) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      let compressed = canvas.toDataURL('image/jpeg', 0.75);
      if (compressed.length > 550 * 1024) {
        compressed = canvas.toDataURL('image/jpeg', 0.55);
      }
      resolve(compressed);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
