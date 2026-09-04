import { Module } from '@nestjs/common';
import { AirController } from './air.controller';
import { AirService } from './air.service';

@Module({
  controllers: [AirController],
  providers: [AirService],
})
export class AirModule {}
