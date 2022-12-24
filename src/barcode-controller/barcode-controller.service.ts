import { Injectable } from '@nestjs/common';
import { SerialPort } from 'serialport';
import { ServiceState } from '../interface/laserController.Interface';

@Injectable()
export class BarcodeControllerService {
  public dataAvaiable = false;
  private state: ServiceState = ServiceState.BOOT_UP;
  private barCodeData = '';
  private barcodeScanner;

  public getBarcodeData = () => {
    console.log(this.dataAvaiable);
    console.log(this.barCodeData);
    this.dataAvaiable = false;
    const data = this.barCodeData;
    this.barCodeData = '';
    return data;
  };

  public getState = () => {
    return this.state;
  };

  public initBarcodeScanner = async (portNo, baudrate, dataBit, stopBit) => {
    return new Promise<void>((res) => {
      const comportParam = {
        portNo: portNo,
        baudrate: baudrate,
        dataBit: dataBit,
        stopBit: stopBit,
      };
      this.state = ServiceState.INIT;
      this.barcodeScanner = new SerialPort(
        {
          path: `COM${comportParam.portNo}`,
          baudRate: comportParam.baudrate,
          dataBits: comportParam.dataBit,
          stopBits: comportParam.stopBit,
        },
        (err) => {
          if (err) {
            console.log(err);
            this.state = ServiceState.ERROR;
            setTimeout(async () => {
              await this.initBarcodeScanner(
                comportParam.portNo,
                comportParam.baudrate,
                comportParam.dataBit,
                comportParam.stopBit,
              );
            }, 1000);
          }
          this.state = ServiceState.READY;
          res();
        },
      );

      this.barcodeScanner.on('open', () => {
        console.log('Barcode connected');
        this.barcodeScanner.on('data', (data) => {
          this.dataAvaiable = true;
          this.barCodeData = Buffer.from(data).toString();
        });
      });
    });
  };
}
