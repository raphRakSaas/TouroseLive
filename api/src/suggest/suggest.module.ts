import { Module } from '@nestjs/common';
import { AirModule } from '../air/air.module';
import { EventsModule } from '../events/events.module';
import { PlacesModule } from '../places/places.module';
import { VeloModule } from '../velo/velo.module';
import { WeatherModule } from '../weather/weather.module';
import { SuggestController } from './suggest.controller';
import { SuggestService } from './suggest.service';

@Module({
  imports: [EventsModule, PlacesModule, VeloModule, WeatherModule, AirModule],
  controllers: [SuggestController],
  providers: [SuggestService],
})
export class SuggestModule {}
