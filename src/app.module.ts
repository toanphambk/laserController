import { Module } from '@nestjs/common';
import { LaserControllerModule } from './laser-controller/laser-controller.module';
import { MainControllerService } from './main-controller/main-controller.service';
import { MainControllerModule } from './main-controller/main-controller.module';
import { BarcodeControllerModule } from './barcode-controller/barcode-controller.module';
import { McProtocolModule } from './mc-protocol/mc-protocol.module';

@Module({
  imports: [
    LaserControllerModule,
    MainControllerModule,
    BarcodeControllerModule,
    McProtocolModule,
  ],
  providers: [MainControllerService],
})
export class AppModule {}
