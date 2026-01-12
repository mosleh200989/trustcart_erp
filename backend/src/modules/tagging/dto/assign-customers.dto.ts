import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class AssignCustomersDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  customerIds!: string[];
}
