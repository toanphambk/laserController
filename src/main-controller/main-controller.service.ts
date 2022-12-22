import { Injectable } from '@nestjs/common';
import { LaserControllerService } from '../laser-controller/laser-controller.service';
import { McProtocolService } from '../mc-protocol/mc-protocol.service';

@Injectable()
export class MainControllerService {
  constructor(
    private laserControlerService: LaserControllerService,
    private mcProtocolService: McProtocolService,
  ) {
    this.mainControllerInit();
  }

  public mainControllerInit = async () => {
    // await this.laserControlerService.laserControllerServiceInit();
    // await this.laserControlerService.laserTrigger(Date.now().toString());
    // await this.laserControlerService.laserTrigger(Date.now().toString());
    await this.mcProtocolService.initPlcSocket('192.168.1.50', 5000);
    const result = await this.mcProtocolService.writeWordToPLC('D', 1000, 4, [
      'a',
      'b',
      'c',
      'd',
    ]);
    const read = await this.mcProtocolService.readWordFromPLC('D', 1050, 4);
    console.log(read);
  };
}
