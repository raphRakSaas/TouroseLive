import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { VeloService } from './velo.service';

@Controller('velo')
export class VeloController {
  constructor(private readonly veloService: VeloService) {}

  @Get('stations')
  listStations() {
    return this.veloService.listStations();
  }

  @Get('stations/:stationId')
  getStation(@Param('stationId') stationId: string) {
    const payload = this.veloService.getStation(stationId);
    if (payload.data === null && payload.status !== 'unavailable') {
      throw new NotFoundException({
        ...payload,
        message: 'Station introuvable',
      });
    }
    return payload;
  }
}
