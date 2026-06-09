import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { LocalStorageService } from '../../services/local-storage.service';

@Module({
  controllers: [UploadController],
  providers: [LocalStorageService],
  exports: [LocalStorageService],
})
export class UploadModule {}
