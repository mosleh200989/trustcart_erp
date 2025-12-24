import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { JobPost, JobStatus } from './entities/job-post.entity';
import { JobApplication, ApplicationStatus, CandidateTag } from './entities/job-application.entity';
import { Interview, InterviewStatus, InterviewType } from './entities/interview.entity';

@Injectable()
export class RecruitmentService {
  constructor(
    @InjectRepository(JobPost)
    private jobPostRepository: Repository<JobPost>,
    @InjectRepository(JobApplication)
    private jobApplicationRepository: Repository<JobApplication>,
    @InjectRepository(Interview)
    private interviewRepository: Repository<Interview>,
  ) {}

  // ==================== JOB POSTS ====================
  async createJobPost(data: any, userId: number): Promise<JobPost> {
    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    
    const jobPost = this.jobPostRepository.create(<any>{
      ...data,
      slug,
      posted_by: userId
    });

    return (await this.jobPostRepository.save(jobPost)) as unknown as JobPost;
  }

  async getAllJobPosts(query: any = {}): Promise<{ data: JobPost[], total: number }> {
    const { page = 1, limit = 20, status, category, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (search) where.title = Like(`%${search}%`);

    const [data, total] = await this.jobPostRepository.findAndCount({
      where,
      relations: ['posted_by_user', 'applications'],
      order: { created_at: 'DESC' },
      skip,
      take: limit
    });

    return { data, total };
  }

  async getPublishedJobs(query: any = {}): Promise<{ data: JobPost[], total: number }> {
    const { page = 1, limit = 20, category, location, job_type } = query;
    const skip = (page - 1) * limit;

    const where: any = { status: JobStatus.PUBLISHED };
    if (category) where.category = category;
    if (location) where.location = Like(`%${location}%`);
    if (job_type) where.job_type = job_type;

    const [data, total] = await this.jobPostRepository.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip,
      take: limit
    });

    return { data, total };
  }

  async getJobPostById(id: number): Promise<JobPost> {
    const jobPost = await this.jobPostRepository.findOne({
      where: { id },
      relations: ['posted_by_user', 'applications']
    });

    if (!jobPost) {
      throw new NotFoundException(`Job post with ID ${id} not found`);
    }

    // Increment view count
    await this.jobPostRepository.update(id, { views_count: jobPost.views_count + 1 });

    return jobPost;
  }

  async getJobPostBySlug(slug: string): Promise<JobPost> {
    const jobPost = await this.jobPostRepository.findOne({
      where: { slug },
      relations: ['posted_by_user']
    });

    if (!jobPost) {
      throw new NotFoundException(`Job post with slug ${slug} not found`);
    }

    await this.jobPostRepository.update(jobPost.id, { views_count: jobPost.views_count + 1 });

    return jobPost;
  }

  async updateJobPost(id: number, data: any): Promise<JobPost> {
    const jobPost = await this.getJobPostById(id);
    Object.assign(jobPost, data);
    return await this.jobPostRepository.save(jobPost);
  }

  async publishJob(id: number): Promise<JobPost> {
    return await this.updateJobPost(id, { status: JobStatus.PUBLISHED });
  }

  async unpublishJob(id: number): Promise<JobPost> {
    return await this.updateJobPost(id, { status: JobStatus.DRAFT });
  }

  async closeJob(id: number): Promise<JobPost> {
    return await this.updateJobPost(id, { status: JobStatus.CLOSED });
  }

  async deleteJobPost(id: number): Promise<void> {
    const jobPost = await this.getJobPostById(id);
    await this.jobPostRepository.remove(jobPost);
  }

  // ==================== JOB APPLICATIONS ====================
  async applyForJob(jobPostId: number, data: any, userId: number): Promise<JobApplication> {
    // Check if already applied
    const existingApplication = await this.jobApplicationRepository.findOne({
      where: { job_post_id: jobPostId, applicant_id: userId }
    });

    if (existingApplication) {
      throw new BadRequestException('You have already applied for this job');
    }

    const application = this.jobApplicationRepository.create(<any>{
      ...data,
      job_post_id: jobPostId,
      applicant_id: userId,
      status: ApplicationStatus.APPLIED
    });

    const saved = (await this.jobApplicationRepository.save(application)) as unknown as JobApplication;

    // Update applications count
    await this.jobPostRepository.increment({ id: jobPostId }, 'applications_count', 1);

    return saved;
  }

  async getAllApplications(query: any = {}): Promise<{ data: JobApplication[], total: number }> {
    const { page = 1, limit = 20, status, job_post_id, tag } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (job_post_id) where.job_post_id = job_post_id;
    if (tag) where.tag = tag;

    const [data, total] = await this.jobApplicationRepository.findAndCount({
      where,
      relations: ['job_post', 'applicant', 'interviews'],
      order: { applied_at: 'DESC' },
      skip,
      take: limit
    });

    return { data, total };
  }

  async getMyApplications(userId: number, query: any = {}): Promise<{ data: JobApplication[], total: number }> {
    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;

    const where: any = { applicant_id: userId };
    if (status) where.status = status;

    const [data, total] = await this.jobApplicationRepository.findAndCount({
      where,
      relations: ['job_post', 'interviews'],
      order: { applied_at: 'DESC' },
      skip,
      take: limit
    });

    return { data, total };
  }

  async getApplicationById(id: number): Promise<JobApplication> {
    const application = await this.jobApplicationRepository.findOne({
      where: { id },
      relations: ['job_post', 'applicant', 'interviews', 'reviewed_by_user']
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }

    return application;
  }

  async updateApplicationStatus(id: number, status: ApplicationStatus, userId: number, notes?: string): Promise<JobApplication> {
    const application = await this.getApplicationById(id);
    
    application.status = status;
    application.reviewed_by = userId;
    application.reviewed_at = new Date();
    
    if (notes) {
      application.recruiter_notes = notes;
    }

    return await this.jobApplicationRepository.save(application);
  }

  async shortlistApplicant(id: number, userId: number): Promise<JobApplication> {
    return await this.updateApplicationStatus(id, ApplicationStatus.SHORTLISTED, userId);
  }

  async rejectApplicant(id: number, userId: number, reason?: string): Promise<JobApplication> {
    return await this.updateApplicationStatus(id, ApplicationStatus.REJECTED, userId, reason);
  }

  async holdApplicant(id: number, userId: number): Promise<JobApplication> {
    return await this.updateApplicationStatus(id, ApplicationStatus.HOLD, userId);
  }

  async tagApplicant(id: number, tag: CandidateTag): Promise<JobApplication> {
    const application = await this.getApplicationById(id);
    application.tag = tag;
    return await this.jobApplicationRepository.save(application);
  }

  // ==================== INTERVIEWS ====================
  async scheduleInterview(applicationId: number, data: any, userId: number): Promise<Interview> {
    const application = await this.getApplicationById(applicationId);

    const interview = this.interviewRepository.create(<any>{
      ...data,
      application_id: applicationId,
      scheduled_by: userId,
      status: InterviewStatus.SCHEDULED
    });

    const saved = (await this.interviewRepository.save(interview)) as unknown as Interview;

    // Update application status
    await this.jobApplicationRepository.update(applicationId, {
      status: ApplicationStatus.INTERVIEW_SCHEDULED
    });

    return saved;
  }

  async getInterviewsByApplication(applicationId: number): Promise<Interview[]> {
    return await this.interviewRepository.find({
      where: { application_id: applicationId },
      relations: ['interviewer', 'scheduled_by_user'],
      order: { scheduled_date: 'DESC' }
    });
  }

  async getMyInterviews(userId: number): Promise<Interview[]> {
    const applications = await this.jobApplicationRepository.find({
      where: { applicant_id: userId },
      select: ['id']
    });

    const applicationIds = applications.map(app => app.id);

    return await this.interviewRepository.find({
      where: { application_id: In(applicationIds) },
      relations: ['application', 'application.job_post'],
      order: { scheduled_date: 'ASC' }
    });
  }

  async updateInterviewStatus(id: number, status: InterviewStatus, feedback?: any): Promise<Interview> {
    const interview = await this.interviewRepository.findOne({ where: { id } });
    
    if (!interview) {
      throw new NotFoundException(`Interview with ID ${id} not found`);
    }

    interview.status = status;
    
    if (feedback) {
      Object.assign(interview, feedback);
    }

    const saved = await this.interviewRepository.save(interview);

    // Update application status if interview completed
    if (status === InterviewStatus.COMPLETED) {
      await this.jobApplicationRepository.update(interview.application_id, {
        status: ApplicationStatus.INTERVIEW_COMPLETED
      });
    }

    return saved;
  }

  async addInterviewFeedback(id: number, feedback: any): Promise<Interview> {
    return await this.updateInterviewStatus(id, InterviewStatus.COMPLETED, feedback);
  }

  // ==================== REPORTS ====================
  async getRecruitmentStats(): Promise<any> {
    const totalJobs = await this.jobPostRepository.count();
    const activeJobs = await this.jobPostRepository.count({ where: { status: JobStatus.PUBLISHED } });
    const totalApplications = await this.jobApplicationRepository.count();
    const shortlisted = await this.jobApplicationRepository.count({ where: { status: ApplicationStatus.SHORTLISTED } });
    const selected = await this.jobApplicationRepository.count({ where: { status: ApplicationStatus.SELECTED } });
    const rejected = await this.jobApplicationRepository.count({ where: { status: ApplicationStatus.REJECTED } });
    const pendingInterviews = await this.interviewRepository.count({ where: { status: InterviewStatus.SCHEDULED } });

    return {
      totalJobs,
      activeJobs,
      totalApplications,
      shortlisted,
      selected,
      rejected,
      pendingInterviews,
      conversionRate: totalApplications > 0 ? ((selected / totalApplications) * 100).toFixed(2) : 0
    };
  }

  async getJobWiseStats(): Promise<any> {
    return await this.jobPostRepository
      .createQueryBuilder('job')
      .select('job.id', 'jobId')
      .addSelect('job.title', 'title')
      .addSelect('job.applications_count', 'totalApplications')
      .addSelect('job.views_count', 'views')
      .addSelect('job.status', 'status')
      .orderBy('job.applications_count', 'DESC')
      .limit(10)
      .getRawMany();
  }
}
