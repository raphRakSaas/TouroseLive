import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AirModule } from './air/air.module';
import { AppController } from './app.controller';
import { EventsModule } from './events/events.module';
import { ParkingModule } from './parking/parking.module';
import { PlacesModule } from './places/places.module';
import { TisseoModule } from './tisseo/tisseo.module';
import { VeloModule } from './velo/velo.module';
import { WeatherModule } from './weather/weather.module';

import { SuggestModule } from './suggest/suggest.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    VeloModule,
    ParkingModule,
    WeatherModule,
    AirModule,
    TisseoModule,
    EventsModule,
    PlacesModule,
    SuggestModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
