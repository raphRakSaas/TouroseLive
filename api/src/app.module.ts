import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { ParkingModule } from './parking/parking.module';
import { VeloModule } from './velo/velo.module';
import { WeatherModule } from './weather/weather.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    VeloModule,
    ParkingModule,
    WeatherModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
