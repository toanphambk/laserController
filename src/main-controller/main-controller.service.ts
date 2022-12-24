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
    state: ServiceState.INIT,
    laserCommand: 0,
  };

  public mainControllerInit = async () => {
    await this.mcProtocolService.initPlcSocket('192.168.1.50', 5000);
    await this.barcodeScanerService.initBarcodeScanner(5, 9600, 8, 1);
    await this.laserControlerService.laserControllerServiceInit();
    await this.onSytemReady();
    this.heartBeat();
    this.systemUpdate();
  };

  private systemUpdate = async () => {
    setInterval(async () => {
      this.systemStateCheck();
      this.lasercommand();
      this.barcodeTranfer();
    }, 200);
  };

  private systemStateCheck = () => {
    if (this.systemState.state != ServiceState.READY) return;
    if (
      this.mcProtocolService.getState() == ServiceState.ERROR ||
      this.barcodeScanerService.getState() == ServiceState.ERROR ||
      this.laserControlerService.getState() == ServiceState.ERROR
    ) {
      this.systemState.state = ServiceState.ERROR;
      this.errorHandler();
    }
  };

  private lasercommand = async () => {
    if (this.systemState.state != ServiceState.READY) return;
    try {
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
    } catch (error) {
      this.errorHandler(`Laser Command Error: \n ${error}`);
    }
  };

  private barcodeTranfer = async () => {
    if (this.systemState.state != ServiceState.READY) return;
    try {
      if (!this.barcodeScanerService.dataAvaiable) {
        return;
      }
      const plcReady = await this.mcProtocolService.readBitFromPLC(
        'M',
        5001,
        1,
      );
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
    } catch (error) {
      this.errorHandler(`barcode tranfer error :\n ${error}`);
    }
  };

  private heartBeat = () => {
    setInterval(async () => {
      if (this.systemState.state != ServiceState.READY) return;
      try {
        const temp = await this.mcProtocolService.readBitFromPLC('M', 5015, 1);
        await this.mcProtocolService.writeBitToPLC('M', 5015, 1, [
          temp[0] == 0 ? 1 : 0,
        ]);
      } catch (error) {
        console.log('hearbeat eror', error);
        this.systemState.state = ServiceState.ERROR;
      }
    }, 5000);
  };
  private onSytemReady = async () => {
    this.systemState.state = ServiceState.READY;
    await this.mcProtocolService.writeWordToPLC('D', 1025, 1, [
      ServiceState.READY,
    ]);
  };

  private errorHandler = async (err?) => {
    this.systemState.state = ServiceState.ERROR;
    console.log(err);
    if (this.mcProtocolService.getState() == ServiceState.READY) {
      await this.mcProtocolService.writeWordToPLC('D', 1025, 1, [
        ServiceState.ERROR,
      ]);
    }
    await this.wait4SystemReady();
    await this.onSytemReady();
  };

  private wait4SystemReady = () => {
    return new Promise<void>((res) => {
      setTimeout(() => {
        if (
          this.laserControlerService.getState() == ServiceState.READY &&
          this.barcodeScanerService.getState() == ServiceState.READY &&
          this.mcProtocolService.getState() == ServiceState.READY
        ) {
          this.systemState.state = ServiceState.READY;
          res();
        }
        this.wait4SystemReady();
      }, 1000);
    });
  };
}
