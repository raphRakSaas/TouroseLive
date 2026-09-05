import { Module } from '@nestjs/common';
import { VeloController } from './velo.controller';
import { VeloService } from './velo.service';

@Module({
  controllers: [VeloController],
  providers: [VeloService],
  exports: [VeloService],
})
export class VeloModule {}
