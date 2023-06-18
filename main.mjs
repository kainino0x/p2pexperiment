import process from 'process';

import { startWS } from './src/startWS.mjs';
import { startHTTP } from './src/startHTTP.mjs';

process.on('uncaughtException', err => {
  console.log('Caught exception: ', err);
});

startWS();
startHTTP();
