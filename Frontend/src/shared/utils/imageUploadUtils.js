import { compressImage } from './imageCompression';

/**
 * Utility to convert/compress an image to WebP format.
 * Primarily used by Quick Commerce and other modules.
 * @param {File} file - Original file
 * @returns {Promise<File>} - Compressed WebP file
 */
export const convertToWebP = async (file) => {
  return await compressImage(file, {
    fileType: 'image/webp',
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1200
  });
};

/**
 * Generic image selection and compression for standard web inputs.
 */
export const handleImageSelect = async (event, callback) => {
  const file = event.target.files?.[0];
  if (file) {
    const compressed = await convertToWebP(file);
    callback(compressed);
  }
};

/**
 * Compresses an image to WebP format and returns a base64 Data URL.
 * Ideal for components using FileReader before sending to backend.
 * @param {File} file - Original image file
 * @returns {Promise<string>} - Base64 Data URL string of the compressed WebP image
 */
export const compressToWebPDataURL = async (file) => {
  if (!file) return null;
  const compressedFile = await convertToWebP(file);
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(compressedFile);
  });
};
