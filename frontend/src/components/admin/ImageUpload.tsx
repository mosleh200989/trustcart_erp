import { useState, useRef } from 'react';
import { FaUpload, FaTrash, FaImage, FaSpinner } from 'react-icons/fa';
import { uploadImageToCloudinary, validateImageFile } from '@/utils/cloudinary';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  folder?: string;
}

export default function ImageUpload({ value, onChange, label = 'Image', folder = 'trustcart/products' }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to Cloudinary
      const result = await uploadImageToCloudinary(file);
      onChange(result.url);
      setPreview(result.url);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload image. Please try again.');
      setPreview(value);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    setPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      
      <div className="space-y-4">
        {/* Preview */}
        {preview && (
          <div className="relative inline-block">
            <img
              src={preview}
              alt="Preview"
              className="w-full max-w-md h-48 object-cover rounded-lg border-2 border-gray-200"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-colors"
              title="Remove image"
            >
              <FaTrash size={14} />
            </button>
          </div>
        )}

        {/* Upload Button */}
        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id={`image-upload-${label}`}
          />
          <label
            htmlFor={`image-upload-${label}`}
            className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-semibold cursor-pointer transition-all shadow-md hover:shadow-lg ${
              uploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {uploading ? (
              <>
                <FaSpinner className="animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <FaUpload />
                {preview ? 'Change Image' : 'Upload Image'}
              </>
            )}
          </label>

          {!preview && (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <FaImage />
              <span>JPEG, PNG, GIF or WebP (max 5MB)</span>
            </div>
          )}
        </div>

        {/* URL Input (fallback) */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">Or enter image URL manually:</label>
          <input
            type="text"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setPreview(e.target.value);
            }}
            placeholder="https://example.com/image.jpg"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
