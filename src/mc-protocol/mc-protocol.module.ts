import { Module } from '@nestjs/common';
import { McProtocolService } from './mc-protocol.service';

@Module({
  providers: [McProtocolService],
  exports: [McProtocolService],
})
export class McProtocolModule {}
