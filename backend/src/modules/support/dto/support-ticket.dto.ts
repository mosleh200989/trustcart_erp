import { IsIn, IsInt, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export const SUPPORT_TICKET_STATUSES = ['open', 'in_progress', 'in-progress', 'resolved', 'closed'] as const;
export const SUPPORT_TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export class CreateSupportTicketDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  subject!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  message!: string;

  @IsOptional()
  @IsIn(SUPPORT_TICKET_PRIORITIES as unknown as string[])
  priority?: (typeof SUPPORT_TICKET_PRIORITIES)[number];
}

export class UpdateSupportTicketDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  subject?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  message?: string;

  @IsOptional()
  @IsIn(SUPPORT_TICKET_STATUSES as unknown as string[])
  status?: (typeof SUPPORT_TICKET_STATUSES)[number];

  @IsOptional()
  @IsIn(SUPPORT_TICKET_PRIORITIES as unknown as string[])
  priority?: (typeof SUPPORT_TICKET_PRIORITIES)[number];

  @IsOptional()
  @ValidateIf((o) => o.assignedTo !== null)
  @IsInt()
  assignedTo?: number | null;
}

export class AddSupportTicketReplyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  response!: string;

  @IsOptional()
  @IsIn(SUPPORT_TICKET_STATUSES as unknown as string[])
  status?: (typeof SUPPORT_TICKET_STATUSES)[number];
}

export class UpdateSupportTicketStatusDto {
  @IsIn(SUPPORT_TICKET_STATUSES as unknown as string[])
  status!: (typeof SUPPORT_TICKET_STATUSES)[number];
}

export class UpdateSupportTicketPriorityDto {
  @IsIn(SUPPORT_TICKET_PRIORITIES as unknown as string[])
  priority!: (typeof SUPPORT_TICKET_PRIORITIES)[number];
}

export class AssignSupportTicketDto {
  @IsOptional()
  assignedTo?: number | null;
}
