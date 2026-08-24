import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { MediaAsset } from './media-asset.entity';

const PAGE_SIZE = 60;

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(MediaAsset)
    private readonly mediaRepo: Repository<MediaAsset>,
  ) {}

  async findAll(search: string | undefined, page: number) {
    const where = search?.trim() ? { filename: ILike(`%${search.trim()}%`) } : {};
    const [items, total] = await this.mediaRepo.findAndCount({
      where,
      order: { created_at: 'DESC' },
      take: PAGE_SIZE,
      skip: (Math.max(1, page) - 1) * PAGE_SIZE,
    });
    return { items, total, page: Math.max(1, page), page_size: PAGE_SIZE };
  }

  async register(
    data: { url: string; filename?: string; mime?: string; size_bytes?: number },
    uploadedBy: number | null,
  ): Promise<MediaAsset> {
    const url = String(data.url || '').trim();
    if (!/^https?:\/\//.test(url)) throw new BadRequestException('A valid file URL is required');

    // Same URL registered twice just returns the existing row
    const existing = await this.mediaRepo.findOne({ where: { url } });
    if (existing) return existing;

    const asset = this.mediaRepo.create({
      url,
      filename: (data.filename || url.split('/').pop() || 'file').slice(0, 490),
      mime: data.mime || null as any,
      size_bytes: data.size_bytes || null as any,
      uploaded_by: uploadedBy,
    });
    return this.mediaRepo.save(asset);
  }

  async remove(id: number): Promise<void> {
    const asset = await this.mediaRepo.findOne({ where: { id } });
    if (!asset) throw new NotFoundException(`Media asset ${id} not found`);
    // Removes the library entry only; the file itself stays on the CDN,
    // so pages already using this URL keep working.
    await this.mediaRepo.remove(asset);
  }
}
