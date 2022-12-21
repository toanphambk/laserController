import { Injectable } from '@nestjs/common';
import { LaserControllerService } from '../laser-controller/laser-controller.service';

@Injectable()
export class MainControllerService {
  constructor(private laserControlerService: LaserControllerService) {
    this.mainControllerInit();
  }

  public mainControllerInit = async () => {
    await this.laserControlerService.laserControllerServiceInit();
    await this.laserControlerService.laserTrigger(Date.now().toString());
    await this.laserControlerService.laserTrigger(Date.now().toString());
  };
}
