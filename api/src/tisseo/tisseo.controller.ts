import { Controller, Get } from '@nestjs/common';
import { TisseoService } from './tisseo.service';

@Controller('tisseo')
export class TisseoController {
  constructor(private readonly tisseoService: TisseoService) {}

  @Get('alerts')
  listAlerts() {
    return this.tisseoService.listAlerts();
  }
}
