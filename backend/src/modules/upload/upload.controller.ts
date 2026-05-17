import {
  Controller,
  Post,
  Delete,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../../services/cloudinary.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('preset') preset?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const isHeroBackground = preset === 'hero-background';
    const result = await this.cloudinaryService.uploadImage(
      file,
      isHeroBackground ? 'trustcart/landing-page-backgrounds' : 'trustcart/products',
      isHeroBackground ? { preserveOriginal: true } : {},
    );
    return {
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
    };
  }

  @Post('image/base64')
  async uploadBase64Image(@Body() body: { image: string; folder?: string; preset?: string }) {
    if (!body.image) {
      throw new BadRequestException('No image data provided');
    }

    const isHeroBackground = body.preset === 'hero-background';
    const folder = body.folder || (isHeroBackground ? 'trustcart/landing-page-backgrounds' : 'trustcart/products');
    const result = await this.cloudinaryService.uploadBase64Image(
      body.image,
      folder,
      isHeroBackground ? { preserveOriginal: true } : {},
    );
    
    return {
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
    };
  }

  @Delete('image')
  async deleteImage(@Body() body: { url: string }) {
    if (!body.url) {
      throw new BadRequestException('No URL provided');
    }

    const publicId = this.cloudinaryService.extractPublicId(body.url);
    const result = await this.cloudinaryService.deleteImage(publicId);
    
    return {
      success: result.result === 'ok',
      message: 'Image deleted successfully',
    };
  }
}
