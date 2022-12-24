import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import net from 'net';
import { EventEmitter } from 'stream';
import { commandType } from '../interface/mc-protocol.Interface';
import { ServiceState } from '../interface/laserController.Interface';

const WRITE_WORD_START_BUFFER = Buffer.from([0x03, 0xff, 0x0a, 0x00]);
const WRITE_BIT_START_BUFFER = Buffer.from([0x02, 0xff, 0x0a, 0x00]);
const READ_WORD_START_BUFFER = Buffer.from([0x01, 0xff, 0x0a, 0x00]);
const READ_BIT_START_BUFFER = Buffer.from([0x00, 0xff, 0x0a, 0x00]);
const D_REGISTER_HEAD_DEVICE_CODE = Buffer.from([0x20, 0x44]);
const M_REGISTER_HEAD_DEVICE_CODE = Buffer.from([0x20, 0x4d]);
const R_REGISTER_HEAD_DEVICE_CODE = Buffer.from([0x20, 0x52]);
const X_REGISTER_HEAD_DEVICE_CODE = Buffer.from([0x20, 0x58]);
const Y_REGISTER_HEAD_DEVICE_CODE = Buffer.from([0x20, 0x59]);
const S_REGISTER_HEAD_DEVICE_CODE = Buffer.from([0x20, 0x53]);
const TN_REGISTER_HEAD_DEVICE_CODE = Buffer.from([0x4e, 0x54]);
const TS_REGISTER_HEAD_DEVICE_CODE = Buffer.from([0x53, 0x54]);
const CN_REGISTER_HEAD_DEVICE_CODE = Buffer.from([0x4e, 0x43]);
const CS_REGISTER_HEAD_DEVICE_CODE = Buffer.from([0x43, 0x53]);
const END_BUFFER = Buffer.from([0x0]);

@Injectable()
export class McProtocolService {
  private state = ServiceState.BOOT_UP;
  private plcSocketEvent = new EventEmitter();
  private plcSocket: net.Socket;
  private queue: { buffer: Buffer; uuid: uuidv4; commandType: commandType }[] =
    [];
  constructor() {
    this.scan();
  }
  public getState = () => {
    return this.state;
  };
  private socketParam = {
    ip: '',
    port: 0,
  };

  public initPlcSocket = (ip, port) => {
    this.socketParam.ip = ip;
    this.socketParam.port = port;

    return new Promise<void>((res) => {
      this.plcSocket = net.createConnection(
        this.socketParam.port,
        this.socketParam.ip,
        () => {
          console.log('init connection to plc');
        },
      );

      this.plcSocket.setEncoding('hex');

      this.plcSocket.on('data', (data) => {
        this.plcSocketEvent.emit('plcSocketDataComming', data);
      });

      this.plcSocket.on('connect', () => {
        console.log(`connected to machine at ${ip} and ${port}`);
        this.state = ServiceState.READY;
        res();
      });

      this.plcSocket.on('close', () => {
        const _date = new Date();
        this.errorHandler(`Connection closed at ${_date.toLocaleTimeString()}`);
        this.plcSocket.end();
        setTimeout(() => {
          this.initPlcSocket(this.socketParam.port, this.socketParam.port);
        }, 2000);
      });
    });
  };

  public writeBitToPLC = (
    deviceType: string,
    deviceNum: number,
    deviceCount: number,
    deviceData: any[],
  ) => {
    return new Promise((res, rej) => {
      const _uuid = uuidv4();

      const deviceCode = this.deviceTypeTobuffer(deviceType);

      if (!deviceCode) {
        rej('wrong device code!');
      }
      if (deviceCount !== deviceData.length) {
        rej('device count and device data number are not match!');
      }

      /* register data to 16 buffer */
      const deviceDataBuffer = this.bitDeviceDataToBuffer(
        deviceCount,
        deviceData,
      );

      const headDevice = this.deviceNumToHeadDevice(deviceNum);

      let buffer = Buffer.concat([
        WRITE_BIT_START_BUFFER,
        headDevice,
        deviceCode,
        Buffer.from([deviceCount]),
        END_BUFFER,
      ]);

      for (let i = 0; i < deviceDataBuffer.length; i++) {
        buffer = Buffer.concat([buffer, deviceDataBuffer[i]]);
      }

      this.queue.push({
        buffer: buffer,
        uuid: _uuid,
        commandType: commandType.WRITE_WORD,
      });

      this.plcSocketEvent.once(_uuid, (data) => {
        if (data) {
          console.log(
            `Command Write Bit ${{
              deviceType,
              deviceNum,
              deviceCount,
              deviceData,
            }} : ${data}`,
          );
          res(true);
        } else {
          this.errorHandler();
          rej(
            `Fail Command Write Bit${{
              deviceType,
              deviceNum,
              deviceCount,
              deviceData,
            }} : ${data}`,
          );
        }
      });
    });
  };

  public writeWordToPLC = (
    deviceType: string,
    deviceNum: number,
    deviceCount: number,
    deviceData: any[],
  ) => {
    return new Promise((res, rej) => {
      const _uuid = uuidv4();

      const deviceCode = this.deviceTypeTobuffer(deviceType);

      if (!deviceCode) {
        rej('wrong device code!');
      }
      if (deviceCount !== deviceData.length) {
        rej('device count and device data number are not match!');
      }

      /* register data to 16 buffer */
      const deviceDataBuffer = this.wordDeviceDataToBuffer(deviceData);

      const headDevice = this.deviceNumToHeadDevice(deviceNum);

      let buffer = Buffer.concat([
        WRITE_WORD_START_BUFFER,
        headDevice,
        deviceCode,
        Buffer.from([deviceCount]),
        END_BUFFER,
      ]);

      for (let i = 0; i < deviceDataBuffer.length; i++) {
        buffer = Buffer.concat([buffer, deviceDataBuffer[i]]);
      }

      this.queue.push({
        buffer: buffer,
        uuid: _uuid,
        commandType: commandType.WRITE_WORD,
      });

      this.plcSocketEvent.once(_uuid, (data) => {
        if (data) {
          console.log(
            `Command Write Word ${{
              deviceType,
              deviceNum,
              deviceCount,
              deviceData,
            }} : ${data}`,
          );
          res(true);
        } else {
          this.errorHandler();
          rej(
            `Fail Command Write Word${{
              deviceType,
              deviceNum,
              deviceCount,
              deviceData,
            }} : ${data}`,
          );
        }
      });
    });
  };

  public readBitFromPLC = (
    deviceType: string,
    deviceNum: number,
    deviceCount: number,
  ) => {
    return new Promise<number[]>((res, rej) => {
      const _uuid = uuidv4();

      const deviceCode = this.deviceTypeTobuffer(deviceType);
      if (!deviceCode) {
        rej('wrong device code!');
      }

      /* register data to 16 buffer */
      const headDevice = this.deviceNumToHeadDevice(deviceNum);

      const buffer = Buffer.concat([
        READ_BIT_START_BUFFER,
        headDevice,
        deviceCode,
        Buffer.from([deviceCount]),
        END_BUFFER,
      ]);

      this.queue.push({
        buffer: buffer,
        uuid: _uuid,
        commandType: commandType.READ_BIT,
      });

      this.plcSocketEvent.once(_uuid, (data) => {
        if (data.substring(0, 4) == '8000') {
          const temp = data
            .substring(4)
            .split('')
            .map((char) => parseInt(char));
          console.log(
            `Command Read Bit ${{
              deviceType,
              deviceNum,
              deviceCount,
            }} : ${temp}`,
          );
          res(temp);
        } else {
          this.errorHandler();
          rej(
            `Fail Command Read Bit${{
              deviceType,
              deviceNum,
              deviceCount,
            }} : ${data}`,
          );
        }
      });
    });
  };

  public readWordFromPLC = (
    deviceType: string,
    deviceNum: number,
    deviceCount: number,
  ) => {
    return new Promise<string>((res, rej) => {
      const _uuid = uuidv4();

      const deviceCode = this.deviceTypeTobuffer(deviceType);
      if (!deviceCode) {
        return console.log('wrong device code!');
      }

      /* register data to 16 buffer */
      const headDevice = this.deviceNumToHeadDevice(deviceNum);

      const buffer = Buffer.concat([
        READ_WORD_START_BUFFER,
        headDevice,
        deviceCode,
        Buffer.from([deviceCount]),
        END_BUFFER,
      ]);

      this.queue.push({
        buffer: buffer,
        uuid: _uuid,
        commandType: commandType.READ_WORD,
      });

      this.plcSocketEvent.once(_uuid, (data) => {
        if (data.substring(0, 4) == '8100') {
          const temp = data.substring(4);
          console.log(
            `Command Read Word  ${{
              deviceType,
              deviceNum,
              deviceCount,
            }} : ${temp}`,
          );
          res(temp);
        } else {
          this.errorHandler();
          rej(
            `Fail Command Read Word : ${{
              deviceType,
              deviceNum,
              deviceCount,
            }} : ${data}`,
          );
        }
      });
    });
  };

  private deviceTypeTobuffer = (deviceType) => {
    switch (deviceType.toUpperCase()) {
      case 'D':
        return D_REGISTER_HEAD_DEVICE_CODE;
      case 'R':
        return R_REGISTER_HEAD_DEVICE_CODE;
      case 'M':
        return M_REGISTER_HEAD_DEVICE_CODE;
      case 'X':
        return X_REGISTER_HEAD_DEVICE_CODE;
      case 'Y':
        return Y_REGISTER_HEAD_DEVICE_CODE;
      case 'S':
        return S_REGISTER_HEAD_DEVICE_CODE;
      case 'TN':
        return TN_REGISTER_HEAD_DEVICE_CODE;
      case 'TS':
        return TS_REGISTER_HEAD_DEVICE_CODE;
      case 'CN':
        return CN_REGISTER_HEAD_DEVICE_CODE;
      case 'CS':
        return CS_REGISTER_HEAD_DEVICE_CODE;
      default:
        return undefined;
    }
  };

  private bitDeviceDataToBuffer = (deviceCount, deviceData) => {
    const buffer = [];
    for (let i = 0; i < deviceData.length; i += 2) {
      if (!(deviceCount % 2)) {
        buffer.push(new Uint8Array([(deviceData[i] << 4) + deviceData[i + 1]]));
      } else {
        if (i === deviceData.length - 1) {
          buffer.push(new Uint8Array([deviceData[i] << 4]));
        } else {
          buffer.push(
            new Uint8Array([(deviceData[i] << 4) + deviceData[i + 1]]),
          );
        }
      }
    }
    return buffer;
  };

  private wordDeviceDataToBuffer = (deviceData) => {
    const buffer = deviceData.map((data) => {
      if (typeof data === 'number') {
        return new Uint8Array([data & 0x000000ff, (data & 0x0000ff00) >> 8]);
      }
      if (typeof data === 'string') {
        if (data.length == 1) {
          return new Uint8Array([data.charCodeAt(0) & 0x000000ff]);
        } else {
          return new Uint8Array([
            data.charAt(0).charCodeAt(0) & 0x000000ff,
            data.charAt(1).charCodeAt(0) & 0x000000ff,
          ]);
        }
      }
    });
    return buffer;
  };

  private deviceNumToHeadDevice = (deviceNum) => {
    return new Uint8Array([
      deviceNum & 0x000000ff,
      (deviceNum & 0x0000ff00) >> 8,
      (deviceNum & 0x00ff0000) >> 16,
      (deviceNum & 0xff000000) >> 24,
    ]);
  };

  private scan = async () => {
    if (this.state != ServiceState.READY) {
      this.errorHandler();
      await new Promise<void>((res) => {
        setTimeout(() => {
          res();
        }, 500);
      });
      return this.scan();
    }
    if (!this.queue.length) {
      await new Promise<void>((res) => {
        setTimeout(() => {
          res();
        }, 50);
      });
      return this.scan();
    }
    const command = this.queue[0];

    await new Promise<void>((res) => {
      this.plcSocketEvent.once('plcSocketDataComming', (data) => {
        /* data parsing */
        const response = data.toString('hex');
        if (
          command.commandType == commandType.WRITE_BIT ||
          command.commandType == commandType.WRITE_WORD
        ) {
          if (response !== '8300' && response !== '8200') {
            console.log('sending command got err \r\n', response);
            this.plcSocketEvent.emit(command.uuid, false);
          } else {
            this.plcSocketEvent.emit(command.uuid, true);
          }
        } else {
          this.plcSocketEvent.emit(command.uuid, response);
        }
        this.scan();
        res();
      });
      this.plcSocket.write(command.buffer);
      this.queue.shift();
    });
  };

  private errorHandler = (err?) => {
    this.state = ServiceState.ERROR;
    this.plcSocketEvent.removeAllListeners();
    this.plcSocket.end();
    setTimeout(() => {
      this.initPlcSocket(this.socketParam.port, this.socketParam.port);
    }, 2000);
    this.queue = [];
    console.log(err);
  };
}
