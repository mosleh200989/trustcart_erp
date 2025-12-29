import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HrmTransfersService } from '../services/hrm-transfers.service';
import { CreateTransferDto } from '../dto/create-transfer.dto';
import { UpdateTransferDto } from '../dto/update-transfer.dto';

@Controller('hrm/transfers')
export class HrmTransfersController {
  constructor(private readonly transfersService: HrmTransfersService) {}

  @Post()
  create(@Body() dto: CreateTransferDto) {
    return this.transfersService.create(dto);
  }

  @Get()
  findAll() {
    return this.transfersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transfersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTransferDto) {
    return this.transfersService.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.transfersService.remove(+id);
  }
}
