import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { RecruitmentService } from './recruitment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('recruitment')
@UseGuards(JwtAuthGuard)
export class RecruitmentController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  // ==================== JOB POSTS ====================
  @Post('jobs')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('create-job-posts')
  async createJobPost(@Body() data: any, @Request() req: any) {
    return await this.recruitmentService.createJobPost(data, req.user.id);
  }

  @Get('jobs')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('view-job-posts')
  async getAllJobPosts(@Query() query: any) {
    return await this.recruitmentService.getAllJobPosts(query);
  }

  @Public()
  @Get('jobs/published')
  async getPublishedJobs(@Query() query: any) {
    return await this.recruitmentService.getPublishedJobs(query);
  }

  @Public()
  @Get('jobs/:id')
  async getJobPostById(@Param('id') id: number) {
    return await this.recruitmentService.getJobPostById(id);
  }

  @Public()
  @Get('jobs/slug/:slug')
  async getJobPostBySlug(@Param('slug') slug: string) {
    return await this.recruitmentService.getJobPostBySlug(slug);
  }

  @Put('jobs/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('edit-job-posts')
  async updateJobPost(@Param('id') id: number, @Body() data: any) {
    return await this.recruitmentService.updateJobPost(id, data);
  }

  @Put('jobs/:id/publish')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('publish-unpublish-jobs')
  async publishJob(@Param('id') id: number) {
    return await this.recruitmentService.publishJob(id);
  }

  @Put('jobs/:id/unpublish')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('publish-unpublish-jobs')
  async unpublishJob(@Param('id') id: number) {
    return await this.recruitmentService.unpublishJob(id);
  }

  @Put('jobs/:id/close')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('close-job-posts')
  async closeJob(@Param('id') id: number) {
    return await this.recruitmentService.closeJob(id);
  }

  @Delete('jobs/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('create-job-posts')
  async deleteJobPost(@Param('id') id: number) {
    return await this.recruitmentService.deleteJobPost(id);
  }

  // ==================== JOB APPLICATIONS ====================
  @Post('jobs/:jobId/apply')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('apply-for-jobs')
  async applyForJob(@Param('jobId') jobId: number, @Body() data: any, @Request() req: any) {
    return await this.recruitmentService.applyForJob(jobId, data, req.user.id);
  }

  @Get('applications')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('view-applicants')
  async getAllApplications(@Query() query: any) {
    return await this.recruitmentService.getAllApplications(query);
  }

  @Get('applications/my')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('view-own-applications')
  async getMyApplications(@Query() query: any, @Request() req: any) {
    return await this.recruitmentService.getMyApplications(req.user.id, query);
  }

  @Get('applications/:id')
  async getApplicationById(@Param('id') id: number) {
    return await this.recruitmentService.getApplicationById(id);
  }

  @Put('applications/:id/shortlist')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('shortlist-applicants')
  async shortlistApplicant(@Param('id') id: number, @Request() req: any) {
    return await this.recruitmentService.shortlistApplicant(id, req.user.id);
  }

  @Put('applications/:id/reject')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('reject-applicants')
  async rejectApplicant(@Param('id') id: number, @Body() body: any, @Request() req: any) {
    return await this.recruitmentService.rejectApplicant(id, req.user.id, body.reason);
  }

  @Put('applications/:id/hold')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('hold-applicants')
  async holdApplicant(@Param('id') id: number, @Request() req: any) {
    return await this.recruitmentService.holdApplicant(id, req.user.id);
  }

  @Put('applications/:id/tag')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tag-applicants')
  async tagApplicant(@Param('id') id: number, @Body() body: any) {
    return await this.recruitmentService.tagApplicant(id, body.tag);
  }

  // ==================== INTERVIEWS ====================
  @Post('applications/:applicationId/interviews')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('schedule-interviews')
  async scheduleInterview(@Param('applicationId') applicationId: number, @Body() data: any, @Request() req: any) {
    return await this.recruitmentService.scheduleInterview(applicationId, data, req.user.id);
  }

  @Get('applications/:applicationId/interviews')
  async getInterviewsByApplication(@Param('applicationId') applicationId: number) {
    return await this.recruitmentService.getInterviewsByApplication(applicationId);
  }

  @Get('interviews/my')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('view-own-interview-status')
  async getMyInterviews(@Request() req: any) {
    return await this.recruitmentService.getMyInterviews(req.user.id);
  }

  @Put('interviews/:id/status')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('update-interview-status')
  async updateInterviewStatus(@Param('id') id: number, @Body() body: any) {
    return await this.recruitmentService.updateInterviewStatus(id, body.status, body.feedback);
  }

  @Put('interviews/:id/feedback')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('add-interview-feedback')
  async addInterviewFeedback(@Param('id') id: number, @Body() feedback: any) {
    return await this.recruitmentService.addInterviewFeedback(id, feedback);
  }

  // ==================== REPORTS ====================
  @Get('reports/stats')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('view-recruitment-reports')
  async getRecruitmentStats() {
    return await this.recruitmentService.getRecruitmentStats();
  }

  @Get('reports/job-wise')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('view-recruitment-reports')
  async getJobWiseStats() {
    return await this.recruitmentService.getJobWiseStats();
  }
}
