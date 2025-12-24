import { Controller, Post, Body, Get, Delete, Param } from '@nestjs/common';
import { SubscribersService } from './subscribers.service';

@Controller('subscribers')
export class SubscribersController {
  constructor(private readonly subscribersService: SubscribersService) {}

  @Post('subscribe')
  async subscribe(@Body() body: { email: string }) {
    return this.subscribersService.subscribe(body.email);
  }

  @Post('unsubscribe')
  async unsubscribe(@Body() body: { email: string }) {
    return this.subscribersService.unsubscribe(body.email);
  }

  @Get()
  async findAll() {
    return this.subscribersService.findAll();
  }
}
