import { useState, useEffect } from 'react';
import { FaPlus, FaTimes, FaStar, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import ImageUpload from './ImageUpload';
import apiClient from '@/services/api';

interface ProductImage {
  id?: number;
  image_url: string;
  display_order: number;
  is_primary: boolean;
}

interface MultipleImageUploadProps {
  productId?: number;
  onImagesChange?: (images: ProductImage[]) => void;
  folder?: string;
}

export default function MultipleImageUpload({ productId, onImagesChange, folder = 'trustcart/products' }: MultipleImageUploadProps) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (productId) {
      loadImages();
    }
  }, [productId]);

  const loadImages = async () => {
    if (!productId) return;
    
    try {
      setLoading(true);
      const response = await apiClient.get(`/products/${productId}/images`);
      setImages(response.data || []);
    } catch (error) {
      console.error('Error loading images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddImage = async (imageUrl: string) => {
    const newImage: ProductImage = {
      image_url: imageUrl,
      display_order: images.length,
      is_primary: images.length === 0
    };

    if (productId) {
      try {
        const response = await apiClient.post(`/products/${productId}/images`, newImage);
        const updatedImages = [...images, response.data];
        setImages(updatedImages);
        onImagesChange?.(updatedImages);
        setShowUpload(false);
      } catch (error) {
        console.error('Error adding image:', error);
        alert('Failed to add image');
      }
    } else {
      // If no productId, just manage locally
      const updatedImages = [...images, newImage];
      setImages(updatedImages);
      onImagesChange?.(updatedImages);
      setShowUpload(false);
    }
  };

  const handleRemoveImage = async (index: number) => {
    const image = images[index];
    
    if (productId && image.id) {
      try {
        await apiClient.delete(`/products/${productId}/images/${image.id}`);
        const updatedImages = images.filter((_, i) => i !== index);
        setImages(updatedImages);
        onImagesChange?.(updatedImages);
      } catch (error) {
        console.error('Error removing image:', error);
        alert('Failed to remove image');
      }
    } else {
      const updatedImages = images.filter((_, i) => i !== index);
      setImages(updatedImages);
      onImagesChange?.(updatedImages);
    }
  };

  const handleSetPrimary = async (index: number) => {
    const updatedImages = images.map((img, i) => ({
      ...img,
      is_primary: i === index
    }));

    if (productId && images[index].id) {
      try {
        await apiClient.put(`/products/${productId}/images/${images[index].id}`, {
          is_primary: true
        });
        setImages(updatedImages);
        onImagesChange?.(updatedImages);
      } catch (error) {
        console.error('Error setting primary image:', error);
        alert('Failed to set primary image');
      }
    } else {
      setImages(updatedImages);
      onImagesChange?.(updatedImages);
    }
  };

  const moveImage = async (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === images.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const updatedImages = [...images];
    [updatedImages[index], updatedImages[newIndex]] = [updatedImages[newIndex], updatedImages[index]];
    
    // Update display_order
    updatedImages.forEach((img, i) => {
      img.display_order = i;
    });

    if (productId) {
      try {
        // Update both images
        await Promise.all([
          apiClient.put(`/products/${productId}/images/${updatedImages[index].id}`, {
            display_order: index
          }),
          apiClient.put(`/products/${productId}/images/${updatedImages[newIndex].id}`, {
            display_order: newIndex
          })
        ]);
        setImages(updatedImages);
        onImagesChange?.(updatedImages);
      } catch (error) {
        console.error('Error reordering images:', error);
        alert('Failed to reorder images');
      }
    } else {
      setImages(updatedImages);
      onImagesChange?.(updatedImages);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Product Images {images.length > 0 && `(${images.length})`}
        </label>
        <button
          type="button"
          onClick={() => setShowUpload(!showUpload)}
          className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          <FaPlus size={12} />
          Add Image
        </button>
      </div>

      {showUpload && (
        <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
          <ImageUpload
            value=""
            onChange={handleAddImage}
            label="Upload New Image"
            folder={folder}
          />
          <button
            type="button"
            onClick={() => setShowUpload(false)}
            className="mt-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading images...</div>
      ) : images.length === 0 ? (
        <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
          No images uploaded yet. Click "Add Image" to upload.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <div
              key={image.id || index}
              className="relative group border-2 rounded-lg overflow-hidden"
              style={{
                borderColor: image.is_primary ? '#f97316' : '#e5e7eb'
              }}
            >
              <img
                src={image.image_url}
                alt={`Product ${index + 1}`}
                className="w-full h-40 object-cover"
              />
              
              {/* Primary Badge */}
              {image.is_primary && (
                <div className="absolute top-2 left-2 bg-orange-500 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                  <FaStar size={10} />
                  Primary
                </div>
              )}

              {/* Actions Overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!image.is_primary && (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(index)}
                    className="bg-orange-500 text-white p-2 rounded-full hover:bg-orange-600 transition"
                    title="Set as primary"
                  >
                    <FaStar size={14} />
                  </button>
                )}
                
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => moveImage(index, 'up')}
                    className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition"
                    title="Move up"
                  >
                    <FaArrowUp size={14} />
                  </button>
                )}
                
                {index < images.length - 1 && (
                  <button
                    type="button"
                    onClick={() => moveImage(index, 'down')}
                    className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition"
                    title="Move down"
                  >
                    <FaArrowDown size={14} />
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition"
                  title="Remove"
                >
                  <FaTimes size={14} />
                </button>
              </div>

              {/* Image Order */}
              <div className="absolute bottom-2 right-2 bg-gray-900 bg-opacity-75 text-white px-2 py-1 rounded text-xs">
                #{index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500">
        <strong>Tip:</strong> The first image (or the one marked as "Primary") will be displayed as the main product image.
        Use the arrow buttons to reorder images.
      </p>
    </div>
  );
}
