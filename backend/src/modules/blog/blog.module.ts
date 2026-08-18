import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { BlogPost } from './blog-post.entity';
import { BlogCategory } from './blog-category.entity';
import { BlogTag } from './blog-tag.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([BlogPost, BlogCategory, BlogTag]),
  ],
  controllers: [BlogController],
  providers: [BlogService],
  exports: [BlogService],
})
export class BlogModule {}
