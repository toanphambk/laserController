import { Injectable } from '@nestjs/common';
import { Hardware } from 'keysender';
import net from 'net';
import { ServiceState } from '../interface/serviceState.Interface';
import { execFile } from 'child_process';
import events from 'events';
import { LaserControllerState } from '../interface/serviceState.Interface';

@Injectable()
export class LaserControllerService {
  private state: LaserControllerState = LaserControllerState.BOOT_UP;
  private laserSocketServer: net.Server;
  private laserControllerEvent = new events.EventEmitter();
  private laserEngraveData = '';

  public getState = () => {
    return this.state;
  };
  public laserControllerServiceInit = async () => {
    this.state = LaserControllerState.INIT;
    await this.initTCPserver();
    await this.initLaserSofware();
    return (this.state = LaserControllerState.READY);
  };

  public triggerLaser = async (data: string): Promise<boolean> => {
    if (this.state != LaserControllerState.READY) {
      console.log('laser service is not ready');
      return false;
    }
    this.state = LaserControllerState.WORKING;
    //check if software is opening
    const laserWindow = new Hardware('EzCad-Lite  - No.ezd');
    if (!laserWindow.workwindow.isOpen()) {
      this.errorHandler('laser sofware is not opening');
      return false;
    }
    laserWindow.workwindow.setForeground();

    const bufferRecived = await new Promise((res) => {
      const tcpBufferTimer = setTimeout(() => {
        this.laserControllerEvent.removeListener('tcpBufferComming', () => {
          this.errorHandler('tcp buffer timeout');
          res(false);
        });
      }, 1000);

      this.laserControllerEvent.once('tcpBufferComming', () => {
        clearTimeout(tcpBufferTimer);
        console.log('tcp buffer recieved');
        res(true);
      });
      this.laserEngraveData = data;
      laserWindow.keyboard.sendKey('f2');
    });

    if (!bufferRecived) {
      console.log('buffer timeout');
      return false;
    }

    await new Promise<void>((res) => {
      setTimeout(() => {
        res();
      }, 200);
    });
    this.state = LaserControllerState.WORKING;
    return true;
  };

  public finishLaser = () => {
    if (this.state == LaserControllerState.WORKING) {
      this.state = LaserControllerState.READY;
      return true;
    }
    console.log('finish laser fail');
    return false;
  };

  public stopLaser = async () => {
    const laserWindow = new Hardware('EzCad-Lite  - No.ezd');
    if (!laserWindow.workwindow.isOpen()) {
      this.errorHandler('laser sofware is not opening');
      return false;
    }
    laserWindow.workwindow.setForeground();
    await new Promise<void>((res) => {
      setTimeout(() => {
        laserWindow.keyboard.sendKey('enter');
        res();
      }, 500);
    });
    this.errorHandler('PLC laser stop signal');
  };
  private initTCPserver = () => {
    return new Promise<void>((res) => {
      this.laserSocketServer = net.createServer((socket) => {
        socket.setEncoding('ascii');
        socket.on('data', (buffer) => {
          if (buffer.includes('TCP:Give me string')) {
            this.laserControllerEvent.emit('tcpBufferComming');
            socket.write(this.laserEngraveData, 'ascii', (err) => {
              if (err) {
                this.errorHandler(err);
              }
              console.log(
                'EzCad TCP Buffer Write Done :',
                this.laserEngraveData,
              );
            });
          }
        });
        socket.on('close', (err) => {
          console.log(err);
          console.log('close');
        });
      });

      this.laserSocketServer.listen(
        { host: '127.0.0.1', family: 'IPv4', port: 1000 },
        () => {
          console.log('opened server on', this.laserSocketServer.address());
          res();
        },
      );
    });
  };

  private initLaserSofware = async (): Promise<void> => {
    const laserWindow = new Hardware('EzCad-Lite  - No.ezd');
    if (laserWindow.workwindow.isOpen()) {
      await new Promise<void>((res) => {
        setTimeout(() => {
          laserWindow.workwindow.setForeground();
          res();
        }, 2000);
      });

      await laserWindow.keyboard.sendKey(['alt', 'f4'], 50, 50);
      laserWindow.keyboard.sendKey('n');
    }

    await new Promise<void>((res) => {
      setTimeout(() => {
        res();
      }, 2000);
    });

    execFile(
      'D:\\Software-Explanation\\EZCAD_LITE_2.14.16(20210519)\\EzCad2.exe',
      (err) => {
        if (err) {
          return this.errorHandler(err);
        }
      },
    );

    await new Promise<void>((res) => {
      setTimeout(() => {
        laserWindow.workwindow.setForeground();
        laserWindow.keyboard.sendKey('enter');
        res();
      }, 2000);
    });

    await new Promise<void>((res) => {
      setTimeout(() => {
        laserWindow.keyboard.sendKey('enter');
        res();
      }, 2000);
    });

    await new Promise<void>((res) => {
      setTimeout(async () => {
        await laserWindow.keyboard.sendKey(['ctrl', 'o'], 50, 1000);
        await laserWindow.keyboard.printText(
          'D:\\Software-Explanation\\EZCAD_LITE_2.14.16(20210519)\\No.ezd',
          0,
          50,
        );
        await laserWindow.keyboard.sendKey('enter');
        res();
      }, 4000);
    });

    await new Promise<void>((res) => {
      setTimeout(() => {
        res();
      }, 2000);
    });

    return;
  };

  private errorHandler = (err) => {
    this.state = LaserControllerState.ERROR;
    console.log(err);
  };
}
