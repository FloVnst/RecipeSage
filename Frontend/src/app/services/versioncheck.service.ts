import { Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { UtilService } from './util.service';
import { HttpService } from './http.service';

import { Workbox } from 'workbox-window';

@Injectable({
  providedIn: 'root'
})
export class VersionCheckService {
  constructor(
    private utilService: UtilService,
    private httpService: HttpService,
    private alertCtrl: AlertController
  ) {
    this.checkVersion();
  }

  async checkVersion() {
    const url = this.utilService.getBase() + 'versioncheck?version=' + (window as any).version;

    return this.httpService.request({
      method: 'get',
      url
    }).then(async res => {
      if (res && res.data && !res.data.supported) {
        const alert = await this.alertCtrl.create({
          header: 'App is out of date',
          subHeader: 'The cached app version is very old. The app will restart to update.',
          buttons: [
            {
              text: 'Ok',
              role: 'cancel',
              handler: () => {
                try {
                  (window as any).forceSWUpdate().then(() => {
                    (window as any).location.reload(true);
                  });
                } catch (e) {
                  (window as any).location.reload(true);
                }
              }
            }]
        });
        alert.present();
      }
    });
  }
}
