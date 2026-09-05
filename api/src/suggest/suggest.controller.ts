import { Body, Controller, Get, Post } from '@nestjs/common';
import { SuggestService } from './suggest.service';
import type { SuggestRequestDto } from './suggest.types';

@Controller('suggest')
export class SuggestController {
  constructor(private readonly suggestService: SuggestService) {}

  @Get('status')
  status() {
    return this.suggestService.getStatus();
  }

  @Post()
  suggest(@Body() body: SuggestRequestDto) {
    return this.suggestService.suggest(body?.prompt ?? '');
  }
}
