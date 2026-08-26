import { Module } from '@nestjs/common';
import { EstimationsService } from './estimations.service';
import { EstimationsController } from './estimations.controller';

@Module({
  controllers: [EstimationsController],
  providers: [EstimationsService],
})
export class EstimationsModule {}
