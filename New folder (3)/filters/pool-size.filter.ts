import { Filter, FilterResult } from './pool-filters';
import { LiquidityPoolKeysV4, Token, TokenAmount } from '@raydium-io/raydium-sdk';
import { Connection, PublicKey } from '@solana/web3.js';
import { logger } from '../utils';
import { RPC_ENDPOINT } from '../constants';

export class PoolSizeFilter implements Filter {
  constructor(
    private readonly connection: Connection,
    private readonly quoteToken: Token,
    private readonly minPoolSize: TokenAmount,
    private readonly maxPoolSize: TokenAmount,
  ) {}

  async execute(poolKeys: LiquidityPoolKeysV4): Promise<FilterResult> {
    try {
        let balance_response
        while(true){
            try{
                balance_response=await this.connection.getTokenAccountBalance(poolKeys.quoteVault)
                break
            }catch(e){
                await new Promise((resolve)=>setTimeout(resolve,1000))
            }
        }      
        const poolSize = new TokenAmount(this.quoteToken, balance_response.value.amount, true);
        logger.info(`Current pool size -> ${Number(balance_response.value.amount)/1000000000}`)
      let inRange = true;
      if (!this.maxPoolSize?.isZero()) {
        inRange = poolSize.raw.lte(this.maxPoolSize.raw);

        if (!inRange) {
          return { ok: false, message: `PoolSize -> Pool size ${poolSize.toFixed()} > ${this.maxPoolSize.toFixed()}` };
        }
      }

      if (!this.minPoolSize?.isZero()) {
        inRange = poolSize.raw.gte(this.minPoolSize.raw);

        if (!inRange) {
          return { ok: false, message: `PoolSize -> Pool size ${poolSize.toFixed()} < ${this.minPoolSize.toFixed()}` };
        }
      }

      return { ok: inRange };
    } catch (error) {
      logger.error(`Failed to check pool size`);
      console.log(error)
    }

    return { ok: false, message: 'PoolSize -> Failed to check pool size' };
  }
}

async function getInitialPoolSize( pair:PublicKey){
  const connection=new Connection(RPC_ENDPOINT,"confirmed");
  const signatures=await connection.getSignaturesForAddress(pair);
  const add_signature=signatures[signatures.length-1].signature
  const add_transaction=await connection.getParsedTransaction(add_signature,{maxSupportedTransactionVersion:0})
  let size=0;
  add_transaction?.meta?.logMessages?.map((message)=>{
      if(message.includes("init_pc_amount")){
          const data=message.split(",")
          data.map((aaa)=>{
              if(aaa.includes("init_pc_amount")){
                  size=Number(aaa.split(":")[1])/1000000000

              }
          })
      }
  });
  return size
}