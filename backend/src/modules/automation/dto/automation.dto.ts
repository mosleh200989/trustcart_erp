import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * The global ValidationPipe runs with `whitelist` and `forbidNonWhitelisted`,
 * so every request body needs an explicit DTO — an undeclared field is a 400,
 * not a silent drop.
 */

export class UnlockAutomationDto {
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class SetGatePasswordDto {
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(200)
  new_password!: string;

  /** Required whenever a password is already set. */
  @IsOptional()
  @IsString()
  current_password?: string;
}

export class UpdateSettingsSectionDto {
  @IsObject()
  patch!: Record<string, any>;
}

export class CreateChannelDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsIn(['facebook', 'instagram'])
  platform?: 'facebook' | 'instagram';

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  page_id!: string;

  @IsOptional()
  @IsString()
  page_access_token?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  ig_account_id?: string;

  @IsOptional()
  @IsInt()
  storefront_id?: number | null;

  @IsOptional()
  @IsIn(['off', 'shadow', 'live'])
  mode?: 'off' | 'shadow' | 'live';

  @IsOptional()
  @IsBoolean()
  reply_to_comments?: boolean;

  @IsOptional()
  @IsBoolean()
  reply_to_messages?: boolean;

  @IsOptional()
  @IsBoolean()
  private_reply_to_comments?: boolean;

  @IsOptional()
  @IsString()
  persona?: string;

  @IsOptional()
  @IsString()
  greeting?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  signature?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  max_replies_per_thread_hour?: number;

  @IsOptional()
  @IsObject()
  business_hours?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateChannelDto extends CreateChannelDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  declare name: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  declare page_id: string;
}

export class CreateRuleDto {
  @IsOptional()
  @IsInt()
  channel_id?: number | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsIn(['contains', 'equals', 'starts_with', 'regex'])
  match_type?: 'contains' | 'equals' | 'starts_with' | 'regex';

  @IsArray()
  @IsString({ each: true })
  patterns!: string[];

  @IsOptional()
  @IsIn(['comment', 'message', 'both'])
  applies_to?: 'comment' | 'message' | 'both';

  @IsOptional()
  @IsIn(['reply', 'escalate', 'ignore', 'ai'])
  action?: 'reply' | 'escalate' | 'ignore' | 'ai';

  @IsOptional()
  @IsString()
  reply_text?: string;

  @IsOptional()
  @IsString()
  private_reply_text?: string;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  stop_on_match?: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateRuleDto extends CreateRuleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  declare name: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  declare patterns: string[];
}

/** Dry-run: which rule would fire for this text, without touching Facebook. */
export class TestRulesDto {
  @IsInt()
  channel_id!: number;

  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsOptional()
  @IsIn(['comment', 'message'])
  thread_type?: 'comment' | 'message';
}

export class ManualReplyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text!: string;
}

export class UpdateConversationStatusDto {
  @IsIn(['bot', 'needs_human', 'human', 'closed'])
  status!: 'bot' | 'needs_human' | 'human' | 'closed';
}

/** Publishing a post to the page from the panel. */
export class PublishPostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message!: string;

  @IsOptional()
  @IsString()
  link?: string;
}

export class SubscribePageDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fields?: string[];
}

/** Kick off a Messenger history import for one channel. */
export class StartImportDto {
  @IsInt()
  channel_id!: number;

  /** How far back to go. Clamped server-side to 1..730 days. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(730)
  since_days?: number;
}

/** Mark or unmark an imported message as a style example. */
export class SetExampleDto {
  @IsBoolean()
  is_example!: boolean;
}

/** Replace the current style-example selection with exactly these messages. */
export class ApplyExamplesDto {
  @IsArray()
  @IsInt({ each: true })
  ids!: number[];
}
