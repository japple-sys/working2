import { 
  Connection,
  PublicKey, 
  Keypair, 
  VersionedTransaction, 
  MessageV0
} 
from '@solana/web3.js';

import { Bundle } from 'jito-ts/dist/sdk/block-engine/types';

import * as Fs from 'fs';


require('dotenv').config();


import { searcherClient } from 'jito-ts/dist/sdk/block-engine/searcher';

import {
ChannelCredentials,
ChannelOptions,
ClientReadableStream,
ServiceError,
} from '@grpc/grpc-js';




import { SearcherServiceClient } from 'jito-ts/dist/gen/block-engine/searcher'
import { AuthServiceClient } from 'jito-ts/dist/gen/block-engine/auth';
import { authInterceptor, AuthProvider } from 'jito-ts/dist/sdk/block-engine/auth';


import {
  PRIVATE_KEY,
  RPC_ENDPOINT,
  RPC_WEBSOCKET_ENDPOINT,
} from '../constants';

import bs58 from 'bs58';
import { logger } from '../utils/logger';
import { bundle } from 'jito-ts';

function sleep(ms: number) {
return new Promise((resolve) => setTimeout(resolve, ms));
}

const SIGNER_WALLET = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));





const blockEngineUrl = process.env.BLOCK_ENGINE_URL || '';

const authKeypairPath = process.env.AUTH_KEYPAIR_PATH || '';
const decodedKey = new Uint8Array(
  JSON.parse(Fs.readFileSync(authKeypairPath).toString()) as number[]
);
const keypair = Keypair.fromSecretKey(decodedKey);

//const c = searcherClient(blockEngineUrl, keypair);
const noAuth = process.env.NO_AUTH || '';
console.log('NO_AUTH:', noAuth);

const c =
  noAuth === 'true'
    ? searcherClient(blockEngineUrl, undefined)
    : searcherClient(blockEngineUrl, keypair);

export const searcherClientAdv = (
url: string,
authKeypair: Keypair,
grpcOptions?: Partial<ChannelOptions>
): SearcherServiceClient => {
const authProvider = new AuthProvider(
  new AuthServiceClient(url, ChannelCredentials.createSsl()),
  authKeypair
);
const client: SearcherServiceClient = new SearcherServiceClient(
  url,
  ChannelCredentials.createSsl(),
  { interceptors: [authInterceptor(authProvider)], ...grpcOptions }
);

return client;
}


// Get Tip Accounts

let tipAccounts: string[] = [];
(async () => {
try {
    tipAccounts = await c.getTipAccounts();
} catch (error) {
    console.error('Error:', error);
}
})();



export async function sendBundle(isBuy:boolean,latestBlockhash: string, message: MessageV0, mint: PublicKey,jitoTip:Number) {
    try {
      const transaction = new VersionedTransaction(message);
      transaction.sign([SIGNER_WALLET]);
      const _tipAccount = tipAccounts[Math.floor(Math.random() * 6)];
      const tipAccount = new PublicKey(_tipAccount);
      const b = new Bundle([transaction], 2);
      b.addTipTx(
          SIGNER_WALLET,
          Number(jitoTip),      // Adjust Jito tip amount here
          tipAccount,
          latestBlockhash
      );
      const bundleResult = await c.sendBundle(b);
      isBuy?logger.info(`Bought->https://gmgn.ai/sol/token/${mint}`):logger.info(`Sold->https://gmgn.ai/sol/token/${mint}`)
      // logger.info(`${bundleResult}`)
    }
    catch (error) {
      logger.error(error);
      
    }  

}
