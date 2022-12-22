import { Injectable } from '@nestjs/common';
import { LaserControllerService } from '../laser-controller/laser-controller.service';
import { McProtocolService } from '../mc-protocol/mc-protocol.service';
import { BarcodeControllerService } from '../barcode-controller/barcode-controller.service';

@Injectable()
export class MainControllerService {
  constructor(
    private laserControlerService: LaserControllerService,
    private mcProtocolService: McProtocolService,
    private barcodeScanerService: BarcodeControllerService,
  ) {
    this.mainControllerInit();
  }

  public mainControllerInit = async () => {
    // await this.laserControlerService.laserControllerServiceInit();
    // await this.laserControlerService.laserTrigger(Date.now().toString());
    // await this.laserControlerService.laserTrigger(Date.now().toString());
    // await this.mcProtocolService.initPlcSocket('192.168.1.50', 5000);
    this.barcodeScanerService.initBarcodeScanner(3, 9600, 8, 1);
  };
}
