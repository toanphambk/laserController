import { Injectable } from '@nestjs/common';
import { SerialPort } from 'serialport';

@Injectable()
export class BarcodeControllerService {
  private barcodeScanner;
  public dataAvaiable = false;
  private barCodeData = '';
  public getBarcodeData = () => {
    this.dataAvaiable = false;
    const data = this.barCodeData;
    this.barCodeData = '';
    return data;
  };

  private barcodeScannerInit = async (portNo, baudrate, dataBit, stopBit) => {
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
        }
        return;
      },
    );

    this.barcodeScanner.on('open', () => {
      console.log('Barcode connected');
      this.barcodeScanner.on('data', (data) => {
        this.dataAvaiable = true;
        this.barCodeData = data;
      });
    });
  };
}
