import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './role.entity';
import { Permission } from './permission.entity';

@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionsRepository: Repository<Permission>,
  ) {}

  // Get all roles
  async findAllRoles(): Promise<Role[]> {
    return this.rolesRepository.find({
      where: { is_active: true },
      order: { priority: 'DESC' }
    });
  }

  // Get role by slug with permissions
  async findRoleBySlug(slug: string): Promise<Role | null> {
    return this.rolesRepository.findOne({
      where: { slug },
      relations: ['permissions']
    });
  }

  async createRole(input: { name: string; slug: string; description?: string | null; priority?: number | null }): Promise<Role> {
    const name = String(input?.name || '').trim();
    const slug = String(input?.slug || '').trim();
    const description = input?.description == null ? '' : String(input.description);
    const priority = input?.priority == null ? 0 : Number(input.priority);

    if (!name) throw new BadRequestException('Role name is required');
    if (!slug) throw new BadRequestException('Role slug is required');
    if (!Number.isFinite(priority)) throw new BadRequestException('Invalid priority');
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new BadRequestException('Role slug must be lowercase letters/numbers with hyphens only');
    }

    const existing = await this.rolesRepository.findOne({ where: [{ slug }, { name }] as any });
    if (existing) {
      throw new BadRequestException('A role with this name/slug already exists');
    }

    const role = new Role();
    role.name = name;
    role.slug = slug;
    role.description = description || '';
    role.priority = Math.trunc(priority);
    role.is_active = true;

    return this.rolesRepository.save(role);
  }

  async deactivateRole(roleId: number): Promise<void> {
    const role = await this.rolesRepository.findOne({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');

    if (role.slug === 'super-admin' || role.slug === 'admin') {
      throw new BadRequestException('This role cannot be deactivated');
    }

    if (!role.is_active) return;

    await this.rolesRepository.update({ id: roleId }, { is_active: false });
  }

  // Get all permissions
  async findAllPermissions(): Promise<Permission[]> {
    return this.permissionsRepository.find({
      order: { module: 'ASC', action: 'ASC' }
    });
  }

  // Get permissions by module
  async findPermissionsByModule(module: string): Promise<Permission[]> {
    return this.permissionsRepository.find({
      where: { module },
      order: { action: 'ASC' }
    });
  }

  async getRolePermissions(roleId: number): Promise<Permission[]> {
    const role = await this.rolesRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const result = await this.permissionsRepository.query(`
      SELECT p.* FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1
      ORDER BY p.module, p.action
    `, [roleId]);

    return result;
  }

  async setRolePermissions(roleId: number, permissionIds: number[]): Promise<void> {
    const role = await this.rolesRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const nextIds = Array.from(
      new Set((Array.isArray(permissionIds) ? permissionIds : []).map((x) => Number(x)).filter((x) => Number.isFinite(x)))
    );

    await this.rolesRepository.manager.transaction(async (manager) => {
      await manager.query(`DELETE FROM role_permissions WHERE role_id = $1`, [roleId]);
      if (nextIds.length === 0) return;

      // Insert in a single query for performance
      const values = nextIds
        .map((_, idx) => `($1, $${idx + 2})`)
        .join(',');

      await manager.query(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ${values} ON CONFLICT DO NOTHING`,
        [roleId, ...nextIds],
      );
    });
  }

  async grantPermissionToRole(roleId: number, permissionId: number): Promise<void> {
    const role = await this.rolesRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    await this.rolesRepository.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [roleId, permissionId]);
  }

  async revokePermissionFromRole(roleId: number, permissionId: number): Promise<void> {
    const role = await this.rolesRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    await this.rolesRepository.query(`
      DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2
    `, [roleId, permissionId]);
  }

  // Check if user has permission
  async checkPermission(userId: number, permissionSlug: string): Promise<boolean> {
    try {
      const result = await this.rolesRepository.query(`
        SELECT EXISTS (
          SELECT 1 FROM user_roles ur
          INNER JOIN roles r ON r.id = ur.role_id
          INNER JOIN role_permissions rp ON ur.role_id = rp.role_id
          INNER JOIN permissions p ON rp.permission_id = p.id
          WHERE ur.user_id = $1 AND p.slug = $2 AND r.is_active = TRUE
        ) as has_permission
      `, [userId, permissionSlug]);

      return result[0]?.has_permission || false;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  // Get user permissions
  async getUserPermissions(userId: number): Promise<Permission[]> {
    try {
      const result = await this.permissionsRepository.query(`
        SELECT DISTINCT p.* FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        INNER JOIN user_roles ur ON rp.role_id = ur.role_id
        INNER JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = $1 AND r.is_active = TRUE
        ORDER BY p.module, p.action
      `, [userId]);

      return result;
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }
  }

  // Get user roles
  async getUserRoles(userId: number): Promise<Role[]> {
    const result = await this.rolesRepository.query(`
      SELECT r.* FROM roles r
      INNER JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1 AND r.is_active = TRUE
      ORDER BY r.priority DESC
    `, [userId]);

    return result;
  }

  // Assign role to user
  async assignRoleToUser(userId: number, roleId: number, assignedBy?: number): Promise<void> {
    const role = await this.rolesRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (!role.is_active) {
      throw new BadRequestException('Cannot assign an inactive role');
    }

    await this.rolesRepository.query(`
      INSERT INTO user_roles (user_id, role_id, assigned_by)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, role_id) DO NOTHING
    `, [userId, roleId, assignedBy]);
  }

  // Remove role from user
  async removeRoleFromUser(userId: number, roleId: number): Promise<void> {
    await this.rolesRepository.query(`
      DELETE FROM user_roles 
      WHERE user_id = $1 AND role_id = $2
    `, [userId, roleId]);
  }

  // Grant custom permission to user
  async grantPermissionToUser(userId: number, permissionId: number, grantedBy?: number): Promise<void> {
    await this.permissionsRepository.query(`
      INSERT INTO user_permissions (user_id, permission_id, granted, granted_by)
      VALUES ($1, $2, TRUE, $3)
      ON CONFLICT (user_id, permission_id) 
      DO UPDATE SET granted = TRUE, granted_at = CURRENT_TIMESTAMP, granted_by = $3
    `, [userId, permissionId, grantedBy]);
  }

  // Revoke custom permission from user
  async revokePermissionFromUser(userId: number, permissionId: number, grantedBy?: number): Promise<void> {
    await this.permissionsRepository.query(`
      INSERT INTO user_permissions (user_id, permission_id, granted, granted_by)
      VALUES ($1, $2, FALSE, $3)
      ON CONFLICT (user_id, permission_id) 
      DO UPDATE SET granted = FALSE, granted_at = CURRENT_TIMESTAMP, granted_by = $3
    `, [userId, permissionId, grantedBy]);
  }

  // Log activity
  async logActivity(data: {
    userId?: number;
    roleSlug?: string;
    module: string;
    action: string;
    resourceType?: string;
    resourceId?: number;
    description?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.rolesRepository.query(`
      INSERT INTO activity_logs 
        (user_id, role_slug, module, action, resource_type, resource_id, description, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      data.userId,
      data.roleSlug,
      data.module,
      data.action,
      data.resourceType,
      data.resourceId,
      data.description,
      data.ipAddress,
      data.userAgent
    ]);
  }

  // Get activity logs
  async getActivityLogs(filters?: {
    userId?: number;
    module?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<any[]> {
    let query = 'SELECT * FROM activity_logs WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.userId) {
      query += ` AND user_id = $${paramIndex}`;
      params.push(filters.userId);
      paramIndex++;
    }

    if (filters?.module) {
      query += ` AND module = $${paramIndex}`;
      params.push(filters.module);
      paramIndex++;
    }

    if (filters?.startDate) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters?.endDate) {
      query += ` AND created_at <= $${paramIndex}`;
      params.push(filters.endDate);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    if (filters?.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
    }

    return this.rolesRepository.query(query, params);
  }
}
