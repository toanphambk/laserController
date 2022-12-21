import { Module } from '@nestjs/common';
import { MainControllerService } from './main-controller.service';
import { LaserControllerModule } from '../laser-controller/laser-controller.module';

@Module({
  imports: [LaserControllerModule],
})
export class MainControllerModule {}
