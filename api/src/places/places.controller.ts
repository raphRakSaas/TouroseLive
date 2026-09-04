import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { PLACE_KINDS, PlacesService } from './places.service';

@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get()
  listPlaces(@Query('kind') kind?: string) {
    if (kind && kind !== 'all' && !PLACE_KINDS.includes(kind as never)) {
      return this.placesService.listPlaces('all');
    }
    return this.placesService.listPlaces(kind);
  }

  @Get(':placeId')
  getPlace(@Param('placeId') placeId: string) {
    const payload = this.placesService.getPlace(placeId);
    if (!payload.data) {
      throw new NotFoundException(`Place ${placeId} not found`);
    }
    return payload;
  }
}
