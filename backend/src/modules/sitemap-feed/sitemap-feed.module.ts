import { Module } from '@nestjs/common';
import { TenantTypeOrmModule } from '../tenant/tenant-typeorm.module';
import { Product } from '../products/product.entity';
import { Category } from '../categories/category.entity';
import { BlogPost } from '../blog/blog-post.entity';
import { SitemapFeedService } from './sitemap-feed.service';
import { SitemapFeedController } from './sitemap-feed.controller';

@Module({
  imports: [TenantTypeOrmModule.forFeature([Product, Category, BlogPost])],
  controllers: [SitemapFeedController],
  providers: [SitemapFeedService],
  exports: [SitemapFeedService],
})
export class SitemapFeedModule {}
