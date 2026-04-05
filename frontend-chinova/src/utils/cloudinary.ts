import apiClient from '@/services/api';

export interface UploadResult {
  url: string;
  public_id: string;
  width: number;
  height: number;
}

/**
 * Upload an image file to Cloudinary via backend API
 */
export const uploadImageToCloudinary = async (file: File): Promise<UploadResult> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post('/upload/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

/**
 * Upload a base64 image to Cloudinary via backend API
 */
export const uploadBase64ToCloudinary = async (
  base64Data: string,
  folder: string = 'trustcart/products'
): Promise<UploadResult> => {
  const response = await apiClient.post('/upload/image/base64', {
    image: base64Data,
    folder,
  });

  return response.data;
};

/**
 * Delete an image from Cloudinary via backend API
 */
export const deleteImageFromCloudinary = async (imageUrl: string): Promise<boolean> => {
  try {
    const response = await apiClient.delete('/upload/image', {
      data: { url: imageUrl },
    });
    return response.data.success;
  } catch (error) {
    console.error('Failed to delete image:', error);
    return false;
  }
};

/**
 * Convert file to base64 string
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Validate image file
 */
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 20 * 1024 * 1024; // 20MB

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.',
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size exceeds 20MB. Please choose a smaller image.',
    };
  }

  return { valid: true };
};
