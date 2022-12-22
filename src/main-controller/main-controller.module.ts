import { Module } from '@nestjs/common';
import { LaserControllerModule } from '../laser-controller/laser-controller.module';
import { McProtocolModule } from '../mc-protocol/mc-protocol.module';
import { BarcodeControllerModule } from '../barcode-controller/barcode-controller.module';
@Module({
  imports: [LaserControllerModule, McProtocolModule, BarcodeControllerModule],
})
export class MainControllerModule {}
