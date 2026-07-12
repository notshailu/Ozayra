import { useState, useCallback } from 'react';
import { uploadService } from '../services/uploadService';
import { compressToWebPDataURL } from '@shared/utils/imageUploadUtils';
import toast from 'react-hot-toast';

/**
 * Hook for managing image uploads with previews and optimization
 */
export const useImageUpload = (options = {}) => {
  const { 
    folder = 'general',
    onSuccess = () => {},
    onError = () => {}
  } = options;

  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 1. Basic Validation
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // 2. Set local preview using raw file for immediate feedback
    const previewReader = new FileReader();
    previewReader.onloadend = () => {
      setPreview(previewReader.result);
    };
    previewReader.readAsDataURL(file);

    // 3. Compress to WebP and Upload to Backend
    try {
      setUploading(true);
      
      const base64 = await compressToWebPDataURL(file);
      
      const result = await uploadService.uploadImage(base64, folder);
      
      const url = result.secureUrl || result.url;
      setImageUrl(url);
      onSuccess(url);
      toast.success('Professional branding image uploaded');
    } catch (error) {
      console.error('Upload Hook Error:', error);
      toast.error('Failed to upload image. Please try again.');
      onError(error);
    } finally {
      setUploading(false);
    }
  }, [folder, onSuccess, onError]);

  const reset = useCallback(() => {
    setPreview(null);
    setImageUrl(null);
    setUploading(false);
  }, []);

  return {
    uploading,
    preview,
    imageUrl,
    handleFileChange,
    reset,
    setPreview,
    setImageUrl
  };
};
