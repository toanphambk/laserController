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
    this.dataAvaiable = false;
    const data = this.barCodeData;
    this.barCodeData = '';
    return data;
  };

  public getBarcodeScannerServiceState = () => {
    return this.state;
  };

  public initBarcodeScanner = async (portNo, baudrate, dataBit, stopBit) => {
    return new Promise<void>((res) => {
      this.state = ServiceState.INIT;
      this.barcodeScanner = new SerialPort(
        {
          path: `COM${portNo}`,
          baudRate: baudrate,
          dataBits: dataBit,
          stopBits: stopBit,
        },
        (err) => {
          if (err) {
            console.log(err);
            this.state = ServiceState.ERROR;
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
          console.log(this.dataAvaiable);
          console.log(this.barCodeData);
        });
      });
    });
  };
}
