import { Module } from '@nestjs/common';
import { LaserControllerModule } from '../laser-controller/laser-controller.module';
import { McProtocolService } from '../mc-protocol/mc-protocol.service';

@Module({
  imports: [LaserControllerModule, McProtocolService],
})
export class MainControllerModule {}
