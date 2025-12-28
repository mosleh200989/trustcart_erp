import { Injectable } from '@nestjs/common';
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

  // Check if user has permission
  async checkPermission(userId: number, permissionSlug: string): Promise<boolean> {
    try {
      const result = await this.rolesRepository.query(`
        SELECT EXISTS (
          SELECT 1 FROM user_roles ur
          INNER JOIN role_permissions rp ON ur.role_id = rp.role_id
          INNER JOIN permissions p ON rp.permission_id = p.id
          WHERE ur.user_id = $1 AND p.slug = $2
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
        WHERE ur.user_id = $1
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
      WHERE ur.user_id = $1
      ORDER BY r.priority DESC
    `, [userId]);

    return result;
  }

  // Assign role to user
  async assignRoleToUser(userId: number, roleId: number, assignedBy?: number): Promise<void> {
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
