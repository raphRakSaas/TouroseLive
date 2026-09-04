import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ParkingService } from './parking.service';

@Controller('parkings')
export class ParkingController {
  constructor(private readonly parkingService: ParkingService) {}

  @Get()
  listLots() {
    return this.parkingService.listLots();
  }

  @Get(':parkingId')
  getLot(@Param('parkingId') parkingId: string) {
    const payload = this.parkingService.getLot(parkingId);
    if (payload.data === null && payload.status !== 'unavailable') {
      throw new NotFoundException({
        ...payload,
        message: 'Parking introuvable',
      });
    }
    return payload;
  }
}
