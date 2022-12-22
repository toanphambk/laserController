import { Injectable } from '@nestjs/common';
import { LaserControllerService } from '../laser-controller/laser-controller.service';
import { McProtocolService } from '../mc-protocol/mc-protocol.service';
import { BarcodeControllerService } from '../barcode-controller/barcode-controller.service';
import { ServiceState } from '../interface/laserController.Interface';

@Injectable()
export class MainControllerService {
  constructor(
    private laserControlerService: LaserControllerService,
    private mcProtocolService: McProtocolService,
    private barcodeScanerService: BarcodeControllerService,
  ) {
    this.mainControllerInit();
  }

  private systemState = {
    laserCommand: 0,
  };

  public mainControllerInit = async () => {
    await this.laserControlerService.laserControllerServiceInit();
    // await this.laserControlerService.laserTrigger(Date.now().toString());
    // await this.laserControlerService.laserTrigger(Date.now().toString());
    await this.barcodeScanerService.initBarcodeScanner(3, 9600, 8, 1);
    await this.mcProtocolService.initPlcSocket('192.168.1.50', 5000);
    this.mcProtocolService.writeWordToPLC('D', 1025, 1, [1]);
    this.heartBeat();
    this.systemUpdate();
  };

  private heartBeat = () => {
    setInterval(async () => {
      if (
        this.laserControlerService.getState() == ServiceState.READY &&
        this.barcodeScanerService.getState() == ServiceState.READY &&
        this.mcProtocolService.getState() == ServiceState.READY
      ) {
        const temp = await this.mcProtocolService.readBitFromPLC('M', 5015, 1);
        await this.mcProtocolService.writeBitToPLC('M', 5015, 1, [
          temp[0] == 0 ? 1 : 0,
        ]);
      }
    }, 5000);
  };

  private systemUpdate = async () => {
    setInterval(async () => {
      const _laserCommand = await this.mcProtocolService.readBitFromPLC(
        'M',
        5000,
        1,
      );
      console.log('laserCommad', _laserCommand);
      if (this.systemState.laserCommand != _laserCommand[0]) {
        if (!_laserCommand[0]) {
          return;
        }
        this.systemState.laserCommand = _laserCommand[0];
        this.laserControlerService.laserTrigger('asdfasdfd');
      }
    }, 1000);
  };
}
