import { Module } from '@nestjs/common';
import { McProtocolService } from './mc-protocol.service';

@Module({
  providers: [McProtocolService],
})
export class McProtocolModule {}
