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
    await this.barcodeScanerService.initBarcodeScanner(5, 9600, 8, 1);
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
      this.lasercommand();
      this.barcodeTranfer();
    }, 200);
  };

  private lasercommand = async () => {
    const _laserCommand = await this.mcProtocolService.readBitFromPLC(
      'M',
      5000,
      1,
    );
    if (this.systemState.laserCommand != _laserCommand[0]) {
      this.systemState.laserCommand = _laserCommand[0];
      if (!_laserCommand[0]) {
        return;
      }
      const dataForLaser = await this.mcProtocolService.readWordFromPLC(
        'D',
        1050,
        10,
      );
      this.laserControlerService.laserTrigger(dataForLaser);
    }
  };

  private barcodeTranfer = async () => {
    if (!this.barcodeScanerService.dataAvaiable) {
      return;
    }
    const plcReady = await this.mcProtocolService.readBitFromPLC('M', 5001, 1);
    console.log(plcReady);

    if (plcReady[0]) {
      return console.log('PLC not ready for barcode');
    }
    const barcodeData = this.barcodeScanerService.getBarcodeData();
    const buffer = [];
    for (let i = 0; i < barcodeData.length; i += 2) {
      if (barcodeData.length % 2 && i == barcodeData.length - 1) {
        buffer.push(barcodeData.substring(i, i + 2) + '\0');
      } else {
        buffer.push(barcodeData.substring(i, i + 2));
      }
    }
    console.log(buffer);

    await this.mcProtocolService.writeWordToPLC(
      'D',
      1000,
      buffer.length,
      buffer,
    );
    await this.mcProtocolService.writeBitToPLC('M', 5001, 1, [1]);
  };
}
