import { Module } from '@nestjs/common';
import { TisseoController } from './tisseo.controller';
import { TisseoService } from './tisseo.service';

@Module({
  controllers: [TisseoController],
  providers: [TisseoService],
})
export class TisseoModule {}
