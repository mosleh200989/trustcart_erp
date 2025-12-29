# Cloudinary Image Upload Integration

## Overview
This integration allows admins to upload images directly to Cloudinary from the product and category management pages.

## Features Implemented

### Backend (NestJS)
1. **Cloudinary Service** (`backend/src/services/cloudinary.service.ts`)
   - Upload images via file buffer or base64
   - Delete images from Cloudinary
   - Auto-resize and optimize images (max 1000x1000)
   - Extract public_id from Cloudinary URLs

2. **Upload Module** (`backend/src/modules/upload/`)
   - `/upload/image` - Upload image file (multipart/form-data)
   - `/upload/image/base64` - Upload base64 encoded image
   - `DELETE /upload/image` - Delete image by URL

3. **Configuration** (`backend/src/config/cloudinary.config.ts`)
   - Reads credentials from environment variables

### Frontend (Next.js/React)
1. **ImageUpload Component** (`frontend/src/components/admin/ImageUpload.tsx`)
   - Drag-and-drop or click to upload
   - Live image preview
   - File validation (type, size)
   - Progress indicator
   - Remove image button
   - Fallback URL input

2. **Cloudinary Utilities** (`frontend/src/utils/cloudinary.ts`)
   - Upload functions
   - Delete functions
   - File validation
   - Base64 conversion

3. **Integration**
   - Products admin page - image upload
   - Categories admin page - image upload
   - Banners admin page (can be added)

## Required NPM Packages

### Backend
```bash
cd backend
npm install cloudinary@^1.41.0
npm install @types/multer --save-dev
npm install @nestjs/platform-express
```

### Frontend
No additional packages required (uses built-in FormData API)

## Environment Variables
Already configured in `.env`:
```env
CLOUDINARY_CLOUD_NAME=dyvotldyr
CLOUDINARY_API_KEY=225644819752952
CLOUDINARY_API_SECRET=z1ZBSVyezR_e8mlP1wOZ7U1UDgU
```

## Usage

### For Products
1. Navigate to `/admin/products`
2. Click "Add Product" or edit existing product
3. Use the "Product Image" upload section:
   - Click "Upload Image" button
   - Select an image file (JPEG, PNG, GIF, WebP up to 5MB)
   - Image automatically uploads to Cloudinary
   - URL is saved in the product record

### For Categories
1. Navigate to `/admin/categories`
2. Click "Add Category" or edit existing category
3. Use the "Category Image" upload section (same as products)

## Image Optimization
All uploaded images are automatically:
- Resized to max 1000x1000px (maintains aspect ratio)
- Optimized quality
- Auto-format conversion to best format
- Stored in organized folders:
  - `trustcart/products/` for product images
  - `trustcart/categories/` for category images

## File Validation
- **Allowed types**: JPEG, PNG, GIF, WebP
- **Max size**: 5MB
- Invalid files show error message before upload

## API Endpoints

### Upload Image
```
POST /upload/image
Content-Type: multipart/form-data
Body: file (FormData)
Response: { url, public_id, width, height }
```

### Upload Base64 Image
```
POST /upload/image/base64
Content-Type: application/json
Body: { image: "data:image/png;base64,...", folder: "trustcart/products" }
Response: { url, public_id, width, height }
```

### Delete Image
```
DELETE /upload/image
Content-Type: application/json
Body: { url: "https://res.cloudinary.com/..." }
Response: { success: true, message: "..." }
```

## Next Steps

To complete the installation:

1. **Install backend dependencies:**
   ```bash
   cd backend
   npm install cloudinary@^1.41.0 @nestjs/platform-express
   npm install @types/multer --save-dev
   ```

2. **Restart the backend server:**
   ```bash
   npm run start:dev
   ```

3. **Test the upload:**
   - Go to `http://localhost:3000/admin/products`
   - Click "Add Product"
   - Try uploading an image

## Troubleshooting

### "Module not found: cloudinary"
Run: `npm install cloudinary` in the backend directory

### "Failed to upload image"
- Check Cloudinary credentials in `.env`
- Ensure backend server is running
- Check browser console for errors
- Verify file size is under 5MB

### Images not displaying
- Check the returned URL starts with `https://res.cloudinary.com/`
- Verify Cloudinary account is active
- Check image URL is saved in database

## Additional Features (Optional)

You can extend this integration to:
- Banner images upload
- User avatars upload
- Blog post images upload
- Multiple image uploads (gallery)
- Image cropping before upload
- Direct Cloudinary widget integration
