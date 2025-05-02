import { streamNewTokens } from './streaming/raydium';
import { streamOpenbook } from './streaming/openbook';
import { GRPC_ENDPOINT } from './constants';
require('dotenv').config();

import express from 'express';
import * as Fs from 'fs';
import cors from 'cors';
import { Keypair } from '@solana/web3.js';
import { logger } from './utils/logger';
// import { init } from './transaction/transaction';
import Client from '@triton-one/yellowstone-grpc';

const blockEngineUrl = process.env.BLOCK_ENGINE_URL || '';
console.log('BLOCK_ENGINE_URL:', blockEngineUrl);

const authKeypairPath = process.env.AUTH_KEYPAIR_PATH || '';
console.log('AUTH_KEYPAIR_PATH:', authKeypairPath);
const decodedKey = new Uint8Array(
  JSON.parse(Fs.readFileSync(authKeypairPath).toString()) as number[]
);
const keypair = Keypair.fromSecretKey(decodedKey);

const client = new Client(GRPC_ENDPOINT, undefined, undefined);

const app=express();
const corsOptions = {
  origin: true,
  credentials: true,
}
app.use(express.json())
app.use(express.urlencoded())
app.use(cors(corsOptions))
async function start() {
  // await init();
  streamNewTokens(client);
  streamOpenbook(client);
}
start();

app.post("/api/v1/set",(req,res)=>{
  const {COMPOUNDING, SEQUENCING,PROFIT_BASED_STOP ,TIME_BASED_SELL}=req.body;
  logger.info(`Resetting environment variables`)
  logger.info(`COMPOUNDING->${COMPOUNDING}`)
  logger.info(`SEQUENCING->${SEQUENCING}`)
  logger.info(`PROFIT_BASED_STOP->${PROFIT_BASED_STOP}`)
  logger.info(`TIME_BASED_SELL->${TIME_BASED_SELL}`)
  process.env.COMPOUNDING=COMPOUNDING;
  process.env.SEQUENCING=SEQUENCING;
  process.env.PROFIT_BASED_STOP=PROFIT_BASED_STOP;
  process.env.TIME_BASED_SELL=TIME_BASED_SELL;
  res.json({message:"Successfully configured variables"});
})
app.listen(5000,()=>console.log("Server is listening on port 5000"));