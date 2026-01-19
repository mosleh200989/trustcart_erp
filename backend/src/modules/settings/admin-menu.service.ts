import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminMenuItem } from './admin-menu-item.entity';
import { CreateAdminMenuItemDto } from './dto/create-admin-menu-item.dto';
import { UpdateAdminMenuItemDto } from './dto/update-admin-menu-item.dto';
import { DEFAULT_ADMIN_MENU, type AdminMenuSeedNode } from './admin-menu.defaults';

export type AdminMenuItemNode = AdminMenuItem & { children: AdminMenuItemNode[] };

@Injectable()
export class AdminMenuService {
  constructor(
    @InjectRepository(AdminMenuItem)
    private repo: Repository<AdminMenuItem>,
  ) {}

  async disableDbMenu(): Promise<{ disabled: number }> {
    const result = await this.repo
      .createQueryBuilder()
      .update(AdminMenuItem)
      .set({ isActive: false })
      .execute();

    return { disabled: result.affected ?? 0 };
  }

  async seedDefaultMenu(mode: 'replace' | 'merge' = 'replace'): Promise<{ created: number; mode: 'replace' | 'merge' }> {
    return this.repo.manager.transaction(async (em) => {
      const repo = em.getRepository(AdminMenuItem);

      if (mode === 'replace') {
        await repo.createQueryBuilder().delete().from(AdminMenuItem).execute();
      }

      const insertNode = async (node: AdminMenuSeedNode, parentId: number | null, sortOrder: number): Promise<void> => {
        if (mode === 'merge') {
          const existing = await repo.findOne({ where: { title: node.title, path: node.path ?? null, parentId } as any });
          if (existing) {
            // Keep existing row intact; still ensure children exist under it.
            let childIndex = 0;
            for (const child of node.children || []) {
              await insertNode(child, existing.id, childIndex++);
            }
            return;
          }
        }

        const item = repo.create({
          title: node.title,
          icon: node.icon ?? null,
          path: node.path ?? null,
          parentId,
          sortOrder,
          isActive: true,
          requiredPermissions: (node.requiredPermissions || []).map((x) => String(x).trim()).filter(Boolean),
        });

        const saved = await repo.save(item);
        created += 1;

        let childIndex = 0;
        for (const child of node.children || []) {
          await insertNode(child, saved.id, childIndex++);
        }
      };

      let created = 0;
      let rootIndex = 0;
      for (const node of DEFAULT_ADMIN_MENU) {
        await insertNode(node, null, rootIndex++);
      }

      return { created, mode };
    });
  }

  async listFlat(includeInactive = true): Promise<AdminMenuItem[]> {
    const where = includeInactive ? {} : { isActive: true };
    return this.repo.find({
      where: where as any,
      order: { parentId: 'ASC', sortOrder: 'ASC', title: 'ASC' },
    });
  }

  async listTree(includeInactive = true): Promise<AdminMenuItemNode[]> {
    const items = await this.listFlat(includeInactive);
    const byId = new Map<number, AdminMenuItemNode>();

    for (const item of items) {
      byId.set(item.id, { ...(item as any), children: [] });
    }

    const roots: AdminMenuItemNode[] = [];

    for (const item of items) {
      const node = byId.get(item.id)!;
      const parentId = item.parentId ?? null;
      if (parentId && byId.has(parentId)) {
        byId.get(parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    // Ensure deterministic ordering
    const sortTree = (nodes: AdminMenuItemNode[]) => {
      nodes.sort((a, b) => (a.sortOrder - b.sortOrder) || a.title.localeCompare(b.title));
      for (const n of nodes) sortTree(n.children);
    };
    sortTree(roots);

    return roots;
  }

  async create(dto: CreateAdminMenuItemDto): Promise<AdminMenuItem> {
    const item = this.repo.create({
      title: dto.title?.trim(),
      icon: dto.icon?.trim() || null,
      path: dto.path?.trim() || null,
      parentId: dto.parentId ?? null,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
      requiredPermissions: (dto.requiredPermissions || []).map((x) => String(x).trim()).filter(Boolean),
    });

    return this.repo.save(item);
  }

  async update(id: number, dto: UpdateAdminMenuItemDto): Promise<AdminMenuItem> {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Menu item not found');

    const next = {
      ...existing,
      ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
      ...(dto.icon !== undefined ? { icon: dto.icon?.trim() || null } : {}),
      ...(dto.path !== undefined ? { path: dto.path?.trim() || null } : {}),
      ...(dto.parentId !== undefined ? { parentId: dto.parentId as any } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.requiredPermissions !== undefined
        ? {
            requiredPermissions: (dto.requiredPermissions || [])
              .map((x) => String(x).trim())
              .filter(Boolean),
          }
        : {}),
    };

    await this.repo.save(next);
    return (await this.repo.findOne({ where: { id } })) as AdminMenuItem;
  }

  async remove(id: number): Promise<void> {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Menu item not found');
    await this.repo.delete({ id });
  }
}
