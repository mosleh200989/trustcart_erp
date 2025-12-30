import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HrmComplaintsService } from '../services/hrm-complaints.service';
import { CreateComplaintDto } from '../dto/create-complaint.dto';
import { UpdateComplaintDto } from '../dto/update-complaint.dto';

@Controller('hrm/complaints')
export class HrmComplaintsController {
  constructor(private readonly complaintsService: HrmComplaintsService) {}

  @Post()
  create(@Body() dto: CreateComplaintDto) {
    return this.complaintsService.create(dto);
  }

  @Get()
  findAll() {
    return this.complaintsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.complaintsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateComplaintDto) {
    return this.complaintsService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.complaintsService.remove(+id);
  }
}
