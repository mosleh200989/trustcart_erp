import { IsString, IsOptional, IsBoolean, IsDateString } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsDateString()
  announcement_date?: string;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
