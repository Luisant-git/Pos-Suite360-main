import { Module } from '@nestjs/common';
import { RawMaterialPurchasesService } from './raw-material-purchases.service';
import { RawMaterialPurchasesController } from './raw-material-purchases.controller';

@Module({
  controllers: [RawMaterialPurchasesController],
  providers: [RawMaterialPurchasesService],
})
export class RawMaterialPurchasesModule {}
