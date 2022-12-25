import { Injectable } from '@nestjs/common';
import { LaserControllerService } from '../laser-controller/laser-controller.service';
import { McProtocolService } from '../mc-protocol/mc-protocol.service';
import { BarcodeControllerService } from '../barcode-controller/barcode-controller.service';
import {
  ServiceState,
  LaserControllerState,
} from '../interface/serviceState.Interface';

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
    await this.laserControlerService.InitLaserControllerService();
    await this.onSytemReady();
    this.heartBeat();
    this.systemUpdate();
  };

  private systemUpdate = async () => {
    setInterval(async () => {
      this.systemStateCheck();
      this.laserCommand();
      this.barcodeTranfer();
    }, 200);
  };

  private systemStateCheck = () => {
    if (this.systemState.state != ServiceState.READY) return;
    if (
      this.mcProtocolService.getState() == ServiceState.ERROR ||
      this.barcodeScanerService.getState() == ServiceState.ERROR ||
      this.laserControlerService.getState() == LaserControllerState.ERROR
    ) {
      this.systemState.state = ServiceState.ERROR;
      this.errorHandler();
    }
  };

  private laserCommand = async () => {
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
        await this.laserControlerService.triggerLaser(
          this.hexToAscii(dataForLaser),
        );
        await this.wait4LaserStop();
      }
    } catch (error) {
      this.errorHandler(`Laser Command Error: \n ${error}`);
    }
  };

  private wait4LaserStop = () => {
    return new Promise<void>((res) => {
      setTimeout(() => {
        const laserRunning = this.mcProtocolService.readBitFromPLC(
          'M',
          5003,
          1,
        );
        const laserEMG = this.mcProtocolService.readBitFromPLC('M', 5005, 1);
        if (laserEMG[0]) {
          this.laserControlerService.stopLaser();
          return res();
        }
        if (!laserRunning[0] && !laserEMG[0]) {
          this.laserControlerService.finishLaser();
          return res();
        }
        this.wait4LaserStop();
      }, 200);
    });
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
      const buffer = this.barcodeDataToBuffer(barcodeData);

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
          this.laserControlerService.getState() == LaserControllerState.READY &&
          this.barcodeScanerService.getState() == ServiceState.READY &&
          this.mcProtocolService.getState() == ServiceState.READY
        ) {
          this.systemState.state = ServiceState.READY;
          return res();
        }
        this.wait4SystemReady();
      }, 1000);
    });
  };

  // convert hex response from plc to string data and remove all null char
  private hexToAscii(hexx) {
    const hex = hexx.toString();
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
      const _char = String.fromCharCode(parseInt(hex.substr(i, 2), 16));
      if (_char != '\0') {
        str += _char;
      }
    }
    return str;
  }

  // convert string to array of char[2] and remove add null last array member if it is char[1]
  private barcodeDataToBuffer = (barcodeData) => {
    const buffer = [];
    for (let i = 0; i < barcodeData.length; i += 2) {
      if (barcodeData.length % 2 && i == barcodeData.length - 1) {
        buffer.push(barcodeData.substring(i, i + 2) + '\0');
      } else {
        buffer.push(barcodeData.substring(i, i + 2));
      }
    }
    return buffer;
  };
}
