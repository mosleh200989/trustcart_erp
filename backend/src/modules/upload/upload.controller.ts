import {
  Controller,
  Post,
  Delete,
  Body,
  Query,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { LocalStorageService } from '../../services/local-storage.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly localStorageService: LocalStorageService) {}

  private getRequestBaseUrl(req: Request): string {
    const host = req.get('x-forwarded-host') || req.get('host');
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    return `${protocol}://${host}`;
  }

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @Query('preset') preset?: string,
    @Query('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const baseUrl = this.getRequestBaseUrl(req);
    let targetFolder = 'products';
    if (folder) {
      targetFolder = folder;
    } else if (preset === 'hero-background') {
      targetFolder = 'landing-page-backgrounds';
    }

    const result = await this.localStorageService.uploadImage(
      file,
      targetFolder,
      baseUrl,
    );
    return {
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
    };
  }

  @Post('image/base64')
  async uploadBase64Image(
    @Body() body: { image: string; folder?: string; preset?: string },
    @Req() req: Request,
  ) {
    if (!body.image) {
      throw new BadRequestException('No image data provided');
    }

    const baseUrl = this.getRequestBaseUrl(req);
    let targetFolder = 'products';
    if (body.folder) {
      targetFolder = body.folder;
    } else if (body.preset === 'hero-background') {
      targetFolder = 'landing-page-backgrounds';
    }

    const result = await this.localStorageService.uploadBase64Image(
      body.image,
      targetFolder,
      baseUrl,
    );
    
    return {
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
    };
  }

  @Post('video')
  @UseInterceptors(FileInterceptor('file'))
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @Query('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const baseUrl = this.getRequestBaseUrl(req);
    const result = await this.localStorageService.uploadVideo(
      file,
      folder || 'landing-page-videos',
      baseUrl,
    );

    return {
      url: result.secure_url,
      public_id: result.public_id,
    };
  }

  @Delete('image')
  async deleteImage(@Body() body: { url: string }) {
    if (!body.url) {
      throw new BadRequestException('No URL provided');
    }

    const success = await this.localStorageService.deleteImage(body.url);
    
    return {
      success,
      message: success ? 'Image deleted successfully' : 'Failed to delete image or file not found',
    };
  }
}
