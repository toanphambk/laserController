import { Injectable } from '@nestjs/common';
import { LaserControllerService } from '../laser-controller/laser-controller.service';
import { McProtocolService } from '../mc-protocol/mc-protocol.service';
import { BarcodeControllerService } from '../barcode-controller/barcode-controller.service';
import { ServiceState } from '../interface/serviceState.Interface';
import { LaserControllerState } from '../interface/serviceState.Interface';

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
    plcLaserCommandStatus: 0,
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
        this.laserControlerService.getState() == LaserControllerState.READY &&
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
      this.laserCommand();
      this.barcodeTranfer();
    }, 200);
  };

  private laserCommand = async () => {
    if (this.systemState.state != ServiceState.READY) return;
    try {
      const _plcLaserCommand = await this.mcProtocolService.readBitFromPLC(
        'M',
        5000,
        1,
      );
      if (this.systemState.plcLaserCommandStatus != _plcLaserCommand[0]) {
        this.systemState.plcLaserCommandStatus = _plcLaserCommand[0];
        if (!_plcLaserCommand[0]) {
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
      console.log(`Laser Command Error: \n ${error}`);
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
}
