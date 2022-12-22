import { Module } from '@nestjs/common';
import { LaserControllerModule } from '../laser-controller/laser-controller.module';
import { McProtocolModule } from '../mc-protocol/mc-protocol.module';
import { BarcodeControllerService } from '../barcode-controller/barcode-controller.service';
@Module({
  imports: [LaserControllerModule, McProtocolModule, BarcodeControllerService],
})
export class MainControllerModule {}
