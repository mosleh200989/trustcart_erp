import { PartialType } from '@nestjs/mapped-types';
import { CreateAwardTypeDto } from './create-award-type.dto';

export class UpdateAwardTypeDto extends PartialType(CreateAwardTypeDto) {}
