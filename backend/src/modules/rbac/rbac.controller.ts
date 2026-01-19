import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('rbac')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  // Get all roles
  @Get('roles')
  @RequirePermissions('view-users')
  async getRoles() {
    return this.rbacService.findAllRoles();
  }

  // Create a role
  @Post('roles')
  @RequirePermissions('assign-roles')
  async createRole(@Body() body: { name: string; slug: string; description?: string; priority?: number }) {
    return this.rbacService.createRole(body);
  }

  // Deactivate a role (soft delete)
  @Delete('roles/:roleId')
  @RequirePermissions('assign-roles')
  async deactivateRole(@Param('roleId') roleId: string) {
    await this.rbacService.deactivateRole(Number(roleId));
    return { message: 'Role deactivated successfully' };
  }

  // Get role by slug with permissions
  @Get('roles/:slug')
  @RequirePermissions('view-users')
  async getRoleBySlug(@Param('slug') slug: string) {
    return this.rbacService.findRoleBySlug(slug);
  }

  // Get all permissions
  @Get('permissions')
  @RequirePermissions('view-users')
  async getPermissions(@Query('module') module?: string) {
    if (module) {
      return this.rbacService.findPermissionsByModule(module);
    }
    return this.rbacService.findAllPermissions();
  }

  // Get role permissions
  @Get('roles/:roleId/permissions')
  @RequirePermissions('assign-roles')
  async getRolePermissions(@Param('roleId') roleId: string) {
    return this.rbacService.getRolePermissions(Number(roleId));
  }

  // Replace role permissions
  @Put('roles/:roleId/permissions')
  @RequirePermissions('assign-roles')
  async setRolePermissions(
    @Param('roleId') roleId: string,
    @Body() body: { permissionIds: number[] },
  ) {
    await this.rbacService.setRolePermissions(Number(roleId), body?.permissionIds || []);
    return { message: 'Role permissions updated successfully' };
  }

  // Grant permission to role
  @Post('roles/:roleId/permissions')
  @RequirePermissions('assign-roles')
  async grantRolePermission(
    @Param('roleId') roleId: string,
    @Body() body: { permissionId: number },
  ) {
    await this.rbacService.grantPermissionToRole(Number(roleId), Number(body?.permissionId));
    return { message: 'Permission granted to role successfully' };
  }

  // Revoke permission from role
  @Delete('roles/:roleId/permissions/:permissionId')
  @RequirePermissions('assign-roles')
  async revokeRolePermission(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
  ) {
    await this.rbacService.revokePermissionFromRole(Number(roleId), Number(permissionId));
    return { message: 'Permission revoked from role successfully' };
  }

  // Get user permissions
  @Get('users/:userId/permissions')
  @RequirePermissions('view-users')
  async getUserPermissions(@Param('userId') userId: string) {
    return this.rbacService.getUserPermissions(Number(userId));
  }

  // Get user roles
  @Get('users/:userId/roles')
  @RequirePermissions('view-users')
  async getUserRoles(@Param('userId') userId: string) {
    return this.rbacService.getUserRoles(Number(userId));
  }

  // Check permission
  @Get('users/:userId/check/:permissionSlug')
  @RequirePermissions('view-users')
  async checkPermission(
    @Param('userId') userId: string,
    @Param('permissionSlug') permissionSlug: string
  ) {
    const hasPermission = await this.rbacService.checkPermission(Number(userId), permissionSlug);
    return { hasPermission };
  }

  // Assign role to user
  @Post('users/:userId/roles')
  @RequirePermissions('assign-roles')
  async assignRole(
    @Param('userId') userId: string,
    @Body() body: { roleId: number },
    @Request() req: any
  ) {
    await this.rbacService.assignRoleToUser(Number(userId), body.roleId, req.user?.id);
    return { message: 'Role assigned successfully' };
  }

  // Remove role from user
  @Delete('users/:userId/roles/:roleId')
  @RequirePermissions('assign-roles')
  async removeRole(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string
  ) {
    await this.rbacService.removeRoleFromUser(Number(userId), Number(roleId));
    return { message: 'Role removed successfully' };
  }

  // Grant permission to user
  @Post('users/:userId/permissions')
  @RequirePermissions('assign-roles')
  async grantPermission(
    @Param('userId') userId: string,
    @Body() body: { permissionId: number },
    @Request() req: any
  ) {
    await this.rbacService.grantPermissionToUser(Number(userId), body.permissionId, req.user?.id);
    return { message: 'Permission granted successfully' };
  }

  // Revoke permission from user
  @Delete('users/:userId/permissions/:permissionId')
  @RequirePermissions('assign-roles')
  async revokePermission(
    @Param('userId') userId: string,
    @Param('permissionId') permissionId: string,
    @Request() req: any
  ) {
    await this.rbacService.revokePermissionFromUser(Number(userId), Number(permissionId), req.user?.id);
    return { message: 'Permission revoked successfully' };
  }

  // Get activity logs
  @Get('activity-logs')
  @RequirePermissions('view-audit-logs')
  async getActivityLogs(
    @Query('userId') userId?: number,
    @Query('module') module?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number
  ) {
    return this.rbacService.getActivityLogs({
      userId: userId ? Number(userId) : undefined,
      module,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? Number(limit) : 100
    });
  }

  // Log activity (manual)
  @Post('activity-logs')
  @RequirePermissions('view-audit-logs')
  async logActivity(@Body() body: any) {
    await this.rbacService.logActivity(body);
    return { message: 'Activity logged successfully' };
  }

  // Helper: Auto-assign admin role to current user (development only)
  @Post('dev/make-me-admin')
  @RequirePermissions('assign-roles')
  async makeMeAdmin(@Request() req: any) {
    if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
      throw new ForbiddenException('Not available in production');
    }
    const userId = req.user.id;
    
    // Find admin or super-admin role
    const roles = await this.rbacService.findAllRoles();
    const adminRole = roles.find(r => r.slug === 'super-admin' || r.slug === 'admin');
    
    if (!adminRole) {
      return { error: 'Admin role not found in database' };
    }

    await this.rbacService.assignRoleToUser(userId, adminRole.id, userId);
    
    return { 
      message: `Admin role (${adminRole.name}) assigned to user ${userId}`,
      role: adminRole 
    };
  }
}
