import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AirModule } from './air/air.module';
import { AppController } from './app.controller';
import { ParkingModule } from './parking/parking.module';
import { TisseoModule } from './tisseo/tisseo.module';
import { VeloModule } from './velo/velo.module';
import { WeatherModule } from './weather/weather.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    VeloModule,
    ParkingModule,
    WeatherModule,
    AirModule,
    TisseoModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
