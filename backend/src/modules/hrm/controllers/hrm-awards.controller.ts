import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HrmAwardsService } from '../services/hrm-awards.service';
import { CreateAwardDto } from '../dto/create-award.dto';
import { UpdateAwardDto } from '../dto/update-award.dto';

@Controller('hrm/awards')
export class HrmAwardsController {
  constructor(private readonly awardsService: HrmAwardsService) {}

  @Post()
  create(@Body() dto: CreateAwardDto) {
    return this.awardsService.create(dto);
  }

  @Get()
  findAll() {
    return this.awardsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.awardsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAwardDto) {
    return this.awardsService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.awardsService.remove(+id);
  }
}
