import { Injectable, BadRequestException } from '@nestjs/common';
import { join, extname, resolve } from 'path';
import * as fs from 'fs';

@Injectable()
export class LocalStorageService {
  private readonly uploadsDir: string;
  private readonly allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  private readonly allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

  constructor() {
    this.uploadsDir = join(process.cwd(), 'uploads');
    this.ensureDirectoryExists(this.uploadsDir);
  }

  /**
   * Helper to ensure a directory exists recursively
   */
  private ensureDirectoryExists(path: string) {
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path, { recursive: true });
    }
  }

  /**
   * Cleans and sanitizes folder name to prevent directory traversal
   */
  cleanFolderName(folder: string): string {
    // Strip "trustcart/" prefix if present
    let clean = folder.replace(/^trustcart\//, '');
    // Remove characters that are not alphanumeric, dashes, underscores, or slashes
    clean = clean.replace(/[^a-zA-Z0-9\-_/]/g, '');
    return clean || 'misc';
  }

  /**
   * Generates a secure, unique filename based on the original name
   */
  private generateUniqueFilename(originalName: string): string {
    const ext = extname(originalName).toLowerCase();
    const baseName = originalName.substring(0, originalName.length - ext.length);
    // Slugify filename: keep only alphanumeric, replace other chars with dashes
    const slug = baseName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100); // Max 100 chars for baseline filename

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e4)}`;
    return `${slug || 'image'}-${uniqueSuffix}${ext}`;
  }

  /**
   * Upload an image file from Multer to local disk
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'products',
    reqBaseUrl: string,
  ): Promise<{ secure_url: string; public_id: string; width: number; height: number }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const ext = extname(file.originalname).toLowerCase();
    if (!this.allowedMimeTypes.includes(file.mimetype) || !this.allowedExtensions.includes(ext)) {
      throw new BadRequestException(
        `Only JPEG, PNG, GIF, and WebP images are allowed. Received: ${file.mimetype} (${ext})`
      );
    }

    const sanitizedFolder = this.cleanFolderName(folder);
    const targetDir = join(this.uploadsDir, sanitizedFolder);
    this.ensureDirectoryExists(targetDir);

    const filename = this.generateUniqueFilename(file.originalname);
    const filePath = join(targetDir, filename);

    try {
      fs.writeFileSync(filePath, file.buffer);
    } catch (error) {
      console.error('Failed to write file to disk:', error);
      throw new BadRequestException('Failed to save file locally');
    }

    const publicId = `${sanitizedFolder}/${filename}`;
    const secureUrl = `${reqBaseUrl}/uploads/${publicId}`;

    return {
      secure_url: secureUrl,
      public_id: publicId,
      width: 1000,
      height: 1000,
    };
  }

  /**
   * Upload a base64 encoded image to local disk
   */
  async uploadBase64Image(
    base64Data: string,
    folder: string = 'products',
    reqBaseUrl: string,
  ): Promise<{ secure_url: string; public_id: string; width: number; height: number }> {
    if (!base64Data) {
      throw new BadRequestException('No image data provided');
    }

    // Try parsing the data URI format
    const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    let buffer: Buffer;
    let ext = '.png';
    let mimeType = 'image/png';

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      buffer = Buffer.from(matches[2], 'base64');
      const mimeExtensions: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
      };
      ext = mimeExtensions[mimeType] || '.png';
    } else {
      // Treat as raw base64 string
      buffer = Buffer.from(base64Data, 'base64');
    }

    if (!this.allowedMimeTypes.includes(mimeType) || !this.allowedExtensions.includes(ext)) {
      throw new BadRequestException(`Invalid image format: ${mimeType}`);
    }

    const sanitizedFolder = this.cleanFolderName(folder);
    const targetDir = join(this.uploadsDir, sanitizedFolder);
    this.ensureDirectoryExists(targetDir);

    const filename = this.generateUniqueFilename(`base64-upload${ext}`);
    const filePath = join(targetDir, filename);

    try {
      fs.writeFileSync(filePath, buffer);
    } catch (error) {
      console.error('Failed to write base64 file to disk:', error);
      throw new BadRequestException('Failed to save base64 file locally');
    }

    const publicId = `${sanitizedFolder}/${filename}`;
    const secureUrl = `${reqBaseUrl}/uploads/${publicId}`;

    return {
      secure_url: secureUrl,
      public_id: publicId,
      width: 1000,
      height: 1000,
    };
  }

  /**
   * Delete an image from local disk safely (protects against directory traversal)
   */
  async deleteImage(publicIdOrUrl: string): Promise<boolean> {
    try {
      // Extract the relative path (e.g. "products/filename.png")
      let relativePath = publicIdOrUrl;
      const marker = '/uploads/';
      const index = publicIdOrUrl.indexOf(marker);
      if (index !== -1) {
        relativePath = publicIdOrUrl.substring(index + marker.length);
      }

      // Resolve the absolute file path
      const filePath = join(this.uploadsDir, relativePath);
      const absolutePath = resolve(filePath);
      const absoluteUploadsDir = resolve(this.uploadsDir);

      // Security validation: verify the path is nested inside the uploads directory
      if (!absolutePath.startsWith(absoluteUploadsDir)) {
        console.warn(`Block directory traversal attempt to delete: ${publicIdOrUrl}`);
        return false;
      }

      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete local image file:', error);
      return false;
    }
  }
}
