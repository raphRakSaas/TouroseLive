import { Controller, Get } from '@nestjs/common';
import { AirService } from './air.service';

@Controller('air')
export class AirController {
  constructor(private readonly airService: AirService) {}

  @Get()
  getIndex() {
    return this.airService.getIndex();
  }
}
