import { Module } from '@nestjs/common';
import { LaserControllerModule } from '../laser-controller/laser-controller.module';
import { McProtocolModule } from '../mc-protocol/mc-protocol.module';
import { MainControllerService } from './main-controller.service';

@Module({
  providers: [MainControllerService],
  imports: [LaserControllerModule, McProtocolModule],
})
export class MainControllerModule {}
