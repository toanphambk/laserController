import { Module } from '@nestjs/common';
import { BarcodeControllerService } from './barcode-controller.service';

@Module({
  providers: [BarcodeControllerService],
})
export class BarcodeControllerModule {}
