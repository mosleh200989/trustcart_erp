import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './role.entity';
import { Permission } from './permission.entity';

type UserPermissionShape = {
  tableExists: boolean;
  permissionColumn?: 'permission_id' | 'permission_slug' | 'permission' | 'slug';
  hasGranted: boolean;
  hasGrantedAt: boolean;
  hasGrantedBy: boolean;
};

@Injectable()
export class RbacService {
  private userPermissionShapePromise?: Promise<UserPermissionShape>;

  constructor(
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionsRepository: Repository<Permission>,
  ) {}

  // Get all roles
  async findAllRoles(opts?: { includeInactive?: boolean }): Promise<Role[]> {
    const includeInactive = Boolean(opts?.includeInactive);
    return this.rolesRepository.find({
      where: includeInactive ? {} : { is_active: true },
      order: { is_active: 'DESC', priority: 'DESC', name: 'ASC' },
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

    // Shift existing roles with same or greater priority
    await this.shiftRolePriorities(priority);

    const role = new Role();
    role.name = name;
    role.slug = slug;
    role.description = description || '';
    role.priority = Math.trunc(priority);
    role.is_active = true;

    return this.rolesRepository.save(role);
  }

  async updateRole(
    roleId: number,
    input: { name?: string; slug?: string; description?: string | null; priority?: number | null; is_active?: boolean },
  ): Promise<Role> {
    const role = await this.rolesRepository.findOne({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');

    const isProtected = role.slug === 'super-admin' || role.slug === 'admin';
    const nextName = input?.name !== undefined ? String(input.name || '').trim() : role.name;
    const nextSlug = input?.slug !== undefined ? String(input.slug || '').trim() : role.slug;
    const nextDescription = input?.description !== undefined ? (input.description == null ? '' : String(input.description)) : role.description;
    const nextPriority = input?.priority !== undefined ? Number(input.priority) : role.priority;
    const nextIsActive = input?.is_active !== undefined ? Boolean(input.is_active) : role.is_active;

    if (!nextName) throw new BadRequestException('Role name is required');
    if (!nextSlug) throw new BadRequestException('Role slug is required');
    if (!Number.isFinite(nextPriority)) throw new BadRequestException('Invalid priority');
    if (!/^[a-z0-9-]+$/.test(nextSlug)) {
      throw new BadRequestException('Role slug must be lowercase letters/numbers with hyphens only');
    }

    if (isProtected) {
      // Avoid breaking core access assumptions.
      if (input?.slug !== undefined && nextSlug !== role.slug) {
        throw new BadRequestException('This role slug cannot be changed');
      }
      if (input?.is_active !== undefined && nextIsActive !== true) {
        throw new BadRequestException('This role cannot be deactivated');
      }
    }

    const existing = await this.rolesRepository.findOne({
      where: [{ slug: nextSlug }, { name: nextName }] as any,
    });
    if (existing && existing.id !== role.id) {
      throw new BadRequestException('A role with this name/slug already exists');
    }

    // If priority is being changed, shift other roles
    if (input?.priority !== undefined && role.priority !== nextPriority) {
      await this.shiftRolePriorities(nextPriority, roleId);
    }

    role.name = nextName;
    role.slug = nextSlug;
    role.description = nextDescription || '';
    role.priority = Math.trunc(nextPriority);
    role.is_active = nextIsActive;

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
      const roleResult = await this.rolesRepository.query(`
        SELECT EXISTS (
          SELECT 1
          FROM users u
          INNER JOIN roles r ON r.id = u.role_id
          INNER JOIN role_permissions rp ON rp.role_id = r.id
          INNER JOIN permissions p ON rp.permission_id = p.id
          WHERE u.id = $1 AND p.slug = $2 AND r.is_active = TRUE
          UNION
          SELECT 1
          FROM user_roles ur
          INNER JOIN roles r ON r.id = ur.role_id
          INNER JOIN role_permissions rp ON rp.role_id = r.id
          INNER JOIN permissions p ON rp.permission_id = p.id
          WHERE ur.user_id = $1 AND p.slug = $2 AND r.is_active = TRUE
        ) as has_permission
      `, [userId, permissionSlug]);

      const roleHasPermission = Boolean(roleResult[0]?.has_permission);
      const directOverride = await this.getDirectUserPermissionOverride(userId, permissionSlug);

      return directOverride ?? roleHasPermission;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  // Get user permissions
  async getUserPermissions(userId: number): Promise<Permission[]> {
    try {
      const rolePermissions = await this.permissionsRepository.query(`
        SELECT DISTINCT p.*
        FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        INNER JOIN roles r ON r.id = rp.role_id
        WHERE r.is_active = TRUE
          AND (
            r.id IN (SELECT role_id FROM users WHERE id = $1)
            OR r.id IN (SELECT role_id FROM user_roles WHERE user_id = $1)
          )
        ORDER BY p.module, p.action
      `, [userId]);

      return this.applyDirectUserPermissionOverrides(userId, rolePermissions);
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return [];
    }
  }

  // Get user roles
  async getUserRoles(userId: number): Promise<Role[]> {
    const result = await this.rolesRepository.query(`
      SELECT DISTINCT r.*
      FROM roles r
      WHERE r.is_active = TRUE
        AND (
          r.id IN (SELECT role_id FROM users WHERE id = $1)
          OR r.id IN (SELECT role_id FROM user_roles WHERE user_id = $1)
        )
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
    await this.setDirectUserPermission(userId, permissionId, true, grantedBy);
  }

  // Revoke custom permission from user
  async revokePermissionFromUser(userId: number, permissionId: number, grantedBy?: number): Promise<void> {
    await this.setDirectUserPermission(userId, permissionId, false, grantedBy);
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

  /**
   * Shift priority of roles >= the given priority by +1
   * Optionally exclude a specific role ID (useful for updates)
   */
  private async shiftRolePriorities(fromPriority: number, excludeId?: number): Promise<void> {
    let query = this.rolesRepository
      .createQueryBuilder()
      .update(Role)
      .set({ priority: () => 'priority + 1' })
      .where('priority >= :fromPriority', { fromPriority });
    
    if (excludeId) {
      query = query.andWhere('id != :excludeId', { excludeId });
    }
    
    await query.execute();
  }

  private async getUserPermissionShape(): Promise<UserPermissionShape> {
    if (!this.userPermissionShapePromise) {
      this.userPermissionShapePromise = this.permissionsRepository.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'user_permissions'
      `).then((rows: Array<{ column_name: string }>) => {
        const columns = new Set(rows.map((row) => row.column_name));
        const permissionColumn: UserPermissionShape['permissionColumn'] = columns.has('permission_id')
          ? 'permission_id'
          : columns.has('permission_slug')
            ? 'permission_slug'
            : columns.has('permission')
              ? 'permission'
              : columns.has('slug')
                ? 'slug'
                : undefined;

        return {
          tableExists: rows.length > 0,
          permissionColumn,
          hasGranted: columns.has('granted'),
          hasGrantedAt: columns.has('granted_at'),
          hasGrantedBy: columns.has('granted_by'),
        };
      }).catch(() => ({
        tableExists: false,
        hasGranted: false,
        hasGrantedAt: false,
        hasGrantedBy: false,
      }));
    }

    return this.userPermissionShapePromise!;
  }

  private async getDirectUserPermissionOverride(userId: number, permissionSlug: string): Promise<boolean | null> {
    const shape = await this.getUserPermissionShape();
    if (!shape.tableExists || !shape.permissionColumn) return null;

    const grantedSelect = shape.hasGranted ? 'up.granted' : 'TRUE AS granted';
    const orderBy = shape.hasGrantedAt ? 'ORDER BY up.granted_at DESC' : '';
    const query = shape.permissionColumn === 'permission_id'
      ? `
        SELECT ${grantedSelect}
        FROM user_permissions up
        INNER JOIN permissions p ON p.id = up.permission_id
        WHERE up.user_id = $1 AND p.slug = $2
        ${orderBy}
        LIMIT 1
      `
      : `
        SELECT ${grantedSelect}
        FROM user_permissions up
        WHERE up.user_id = $1 AND up.${shape.permissionColumn} = $2
        ${orderBy}
        LIMIT 1
      `;

    const result = await this.permissionsRepository.query(query, [userId, permissionSlug]);
    if (!result.length) return null;

    return Boolean(result[0].granted);
  }

  private async applyDirectUserPermissionOverrides(userId: number, rolePermissions: Permission[]): Promise<Permission[]> {
    const shape = await this.getUserPermissionShape();
    if (!shape.tableExists || !shape.permissionColumn) return rolePermissions;

    const grantedSelect = shape.hasGranted ? 'up.granted' : 'TRUE AS granted';
    const query = shape.permissionColumn === 'permission_id'
      ? `
        SELECT p.*, ${grantedSelect}
        FROM user_permissions up
        INNER JOIN permissions p ON p.id = up.permission_id
        WHERE up.user_id = $1
      `
      : `
        SELECT p.*, ${grantedSelect}
        FROM user_permissions up
        INNER JOIN permissions p ON p.slug = up.${shape.permissionColumn}
        WHERE up.user_id = $1
      `;

    const directRows = await this.permissionsRepository.query(query, [userId]);
    const effective = new Map<number, Permission>();
    rolePermissions.forEach((permission) => effective.set(permission.id, permission));

    directRows.forEach((row: Permission & { granted?: boolean }) => {
      if (row.granted === false) {
        effective.delete(row.id);
        return;
      }

      effective.set(row.id, row);
    });

    return Array.from(effective.values()).sort((a, b) => {
      const moduleCompare = String(a.module || '').localeCompare(String(b.module || ''));
      if (moduleCompare !== 0) return moduleCompare;
      return String(a.action || '').localeCompare(String(b.action || ''));
    });
  }

  private async setDirectUserPermission(
    userId: number,
    permissionId: number,
    granted: boolean,
    grantedBy?: number,
  ): Promise<void> {
    const shape = await this.getUserPermissionShape();
    if (!shape.tableExists || !shape.permissionColumn) {
      throw new BadRequestException('User permission overrides are not configured for this database');
    }

    const permission = await this.permissionsRepository.findOne({ where: { id: permissionId } });
    if (!permission) throw new NotFoundException('Permission not found');

    const permissionValue = shape.permissionColumn === 'permission_id' ? permission.id : permission.slug;
    const columns = ['user_id', shape.permissionColumn];
    const values = ['$1', '$2'];
    const params: any[] = [userId, permissionValue];

    if (shape.hasGranted) {
      columns.push('granted');
      values.push(`$${params.length + 1}`);
      params.push(granted);
    }

    if (shape.hasGrantedBy) {
      columns.push('granted_by');
      values.push(`$${params.length + 1}`);
      params.push(grantedBy);
    }

    await this.permissionsRepository.query(
      `DELETE FROM user_permissions WHERE user_id = $1 AND ${shape.permissionColumn} = $2`,
      [userId, permissionValue],
    );

    await this.permissionsRepository.query(
      `INSERT INTO user_permissions (${columns.join(', ')}) VALUES (${values.join(', ')})`,
      params,
    );
  }
}
