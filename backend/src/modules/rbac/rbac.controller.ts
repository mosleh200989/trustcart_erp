import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('rbac')
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  // Get all roles
  @Get('roles')
  async getRoles() {
    return this.rbacService.findAllRoles();
  }

  // Get role by slug with permissions
  @Get('roles/:slug')
  async getRoleBySlug(@Param('slug') slug: string) {
    return this.rbacService.findRoleBySlug(slug);
  }

  // Get all permissions
  @Get('permissions')
  async getPermissions(@Query('module') module?: string) {
    if (module) {
      return this.rbacService.findPermissionsByModule(module);
    }
    return this.rbacService.findAllPermissions();
  }

  // Get user permissions
  @Get('users/:userId/permissions')
  async getUserPermissions(@Param('userId') userId: number) {
    return this.rbacService.getUserPermissions(userId);
  }

  // Get user roles
  @Get('users/:userId/roles')
  async getUserRoles(@Param('userId') userId: number) {
    return this.rbacService.getUserRoles(userId);
  }

  // Check permission
  @Get('users/:userId/check/:permissionSlug')
  async checkPermission(
    @Param('userId') userId: number,
    @Param('permissionSlug') permissionSlug: string
  ) {
    const hasPermission = await this.rbacService.checkPermission(userId, permissionSlug);
    return { hasPermission };
  }

  // Assign role to user
  @Post('users/:userId/roles')
  async assignRole(
    @Param('userId') userId: number,
    @Body() body: { roleId: number; assignedBy?: number }
  ) {
    await this.rbacService.assignRoleToUser(userId, body.roleId, body.assignedBy);
    return { message: 'Role assigned successfully' };
  }

  // Remove role from user
  @Delete('users/:userId/roles/:roleId')
  async removeRole(
    @Param('userId') userId: number,
    @Param('roleId') roleId: number
  ) {
    await this.rbacService.removeRoleFromUser(userId, roleId);
    return { message: 'Role removed successfully' };
  }

  // Grant permission to user
  @Post('users/:userId/permissions')
  async grantPermission(
    @Param('userId') userId: number,
    @Body() body: { permissionId: number; grantedBy?: number }
  ) {
    await this.rbacService.grantPermissionToUser(userId, body.permissionId, body.grantedBy);
    return { message: 'Permission granted successfully' };
  }

  // Revoke permission from user
  @Delete('users/:userId/permissions/:permissionId')
  async revokePermission(
    @Param('userId') userId: number,
    @Param('permissionId') permissionId: number,
    @Body() body: { grantedBy?: number }
  ) {
    await this.rbacService.revokePermissionFromUser(userId, permissionId, body.grantedBy);
    return { message: 'Permission revoked successfully' };
  }

  // Get activity logs
  @Get('activity-logs')
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
  async logActivity(@Body() body: any) {
    await this.rbacService.logActivity(body);
    return { message: 'Activity logged successfully' };
  }

  // Helper: Auto-assign admin role to current user (development only)
  @Post('dev/make-me-admin')
  @UseGuards(JwtAuthGuard)
  async makeMeAdmin(@Request() req: any) {
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
