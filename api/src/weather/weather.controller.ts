import { Controller, Get, Query } from '@nestjs/common';
import { WeatherService } from './weather.service';

@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get('districts')
  listDistricts() {
    return this.weatherService.listDistricts();
  }

  @Get()
  getForecast(@Query('districtId') districtId?: string) {
    return this.weatherService.getForecast(districtId);
  }
}
