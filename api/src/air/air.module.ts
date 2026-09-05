import { Module } from '@nestjs/common';
import { AirController } from './air.controller';
import { AirService } from './air.service';

@Module({
  controllers: [AirController],
  providers: [AirService],
  exports: [AirService],
})
export class AirModule {}
