import { Controller, Get, Param } from '@nestjs/common';
import { BlogService } from './blog.service';

@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get('posts')
  async findAllPosts() {
    return this.blogService.findAllPosts();
  }

  @Get('posts/slug/:slug')
  async findPostBySlug(@Param('slug') slug: string) {
    return this.blogService.findPostBySlug(slug);
  }

  @Get('posts/category/:categorySlug')
  async findPostsByCategory(@Param('categorySlug') categorySlug: string) {
    return this.blogService.findPostsByCategory(categorySlug);
  }

  @Get('posts/tag/:tagSlug')
  async findPostsByTag(@Param('tagSlug') tagSlug: string) {
    return this.blogService.findPostsByTag(tagSlug);
  }

  @Get('posts/:id/related')
  async findRelatedPosts(@Param('id') id: string) {
    return this.blogService.findRelatedPosts(parseInt(id), 3);
  }

  @Get('categories')
  async findAllCategories() {
    return this.blogService.findAllCategories();
  }

  @Get('tags')
  async findAllTags() {
    return this.blogService.findAllTags();
  }
}
