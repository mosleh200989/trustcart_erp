import { Module } from '@nestjs/common';
import { TenantTypeOrmModule } from '../tenant/tenant-typeorm.module';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { BlogPost } from './blog-post.entity';
import { BlogCategory } from './blog-category.entity';
import { BlogTag } from './blog-tag.entity';

@Module({
  imports: [
    TenantTypeOrmModule.forFeature([BlogPost, BlogCategory, BlogTag]),
  ],
  controllers: [BlogController],
  providers: [BlogService],
  exports: [BlogService],
})
export class BlogModule {}
