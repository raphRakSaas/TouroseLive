import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .then(() => {
    if ('serviceWorker' in navigator && !location.hostname.includes('localhost')) {
      void navigator.serviceWorker.register('/sw.js');
    }
  })
  .catch((err) => console.error(err));
