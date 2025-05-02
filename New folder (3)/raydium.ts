import { CommitmentLevel, SubscribeRequest } from "@triton-one/yellowstone-grpc";
import pino from "pino";
// import { logStream } from "../utils/filelogger";
// import { sendNewTokenAlert } from "../utils/sendtgalert";
// import delay from "../utils/delay";

const transport = pino.transport({
  target: 'pino-pretty',
});

export const logger = pino(
  {
    level: 'info',
    serializers: {
      error: pino.stdSerializers.err,
    },
    base: undefined,
  },
  transport,
);

import Client from "@triton-one/yellowstone-grpc";
import { LIQUIDITY_STATE_LAYOUT_V4, MARKET_STATE_LAYOUT_V3 } from "@raydium-io/raydium-sdk";
import { Connection, PublicKey } from "@solana/web3.js";
import { bufferRing } from "./openbook";
import { multiBuy } from "../transaction/transaction";
import { createPoolKeys } from "../liquidity";
import { RPC_ENDPOINT, MIN_POOL_SIZE, MAX_POOL_SIZE, COMMITMENT_LEVEL } from "../constants";

const solanaConnection = new Connection(RPC_ENDPOINT, COMMITMENT_LEVEL);
let mints: string[] = []
let isBought: boolean = false
export async function streamNewTokens(client: Client) {
  const stream = await client.subscribe();

  stream.on("data", async (data) => {
    if (data.account === undefined) return;
    const poolState = LIQUIDITY_STATE_LAYOUT_V4.decode(data.account.account.data);
    logger.info(`MINT ADDRESS -> ${poolState.baseMint.toString()}`);
    if (mints.includes(poolState.baseMint.toString())) return;
    if (isBought) return;
    mints.push(poolState.baseMint.toString());

    const SEQUENCING = process.env.SEQUENCING;
    isBought = SEQUENCING == "true" ? false : true;
    const tokenAccount = new PublicKey(data.account.account.pubkey);

    let attempts = 0;
    const maxAttempts = 2;

    const intervalId = setInterval(async () => {
      const marketDetails = bufferRing.findPattern(poolState.baseMint);
      if (Buffer.isBuffer(marketDetails)) {
        const fullMarketDetailsDecoded = MARKET_STATE_LAYOUT_V3.decode(marketDetails);
        const marketDetailsDecoded = {
          bids: fullMarketDetailsDecoded.bids,
          asks: fullMarketDetailsDecoded.asks,
          eventQueue: fullMarketDetailsDecoded.eventQueue,
        };
        try {
          clearInterval(intervalId);
          const poolkeys = createPoolKeys(tokenAccount, poolState, marketDetailsDecoded);
          const isFreezable = await checkIfTokenIsFrozen(poolkeys.baseMint, solanaConnection);

          const initialPoolSize = await getInitialPoolSize(tokenAccount);
          let currentPoolSize = 0;
          let balanceResponse;
          let count = 0;
          while (true) {
            try {
              balanceResponse = await solanaConnection.getTokenAccountBalance(poolState.quoteVault);
              currentPoolSize = Number(balanceResponse.value.amount) / 1e9
              break;
            }
            catch {
              count += 1;
              console.log("Current Pool Size Attempts: ", count);
              if (count === 100) {
                currentPoolSize = 0;
                break;
              }
              await delay(100);
            }
          }  

          logTokenInfo(initialPoolSize, currentPoolSize, poolState.baseMint.toString());

          if (!isFreezable) {
            if (initialPoolSize >= MIN_POOL_SIZE && initialPoolSize <= MAX_POOL_SIZE && currentPoolSize >= initialPoolSize) {
              await sendNewTokenAlert(poolState.baseMint.toString());
              await multiBuy(currentPoolSize, tokenAccount, poolState, marketDetailsDecoded);
              isBought = false;
            } else {
              isBought = false;
            }
          } else isBought = false;
        } catch (e) {
          logger.error(e);
          isBought = false;
        }
      } else if (attempts >= maxAttempts) {
        clearInterval(intervalId);
        isBought = false;
      }
      attempts++;
    }, 100);
  });

  // Create a subscription request.
  const request: SubscribeRequest = {
    "slots": {},
    "accounts": {
      "raydium": {
        "account": [],
        "filters": [
          { datasize: LIQUIDITY_STATE_LAYOUT_V4.span.toString() },
          {
            "memcmp": {
              "offset": LIQUIDITY_STATE_LAYOUT_V4.offsetOf('quoteMint').toString(), // Filter for only tokens paired with SOL
              "base58": "So11111111111111111111111111111111111111112"
            }
          },
          {
            "memcmp": {
              "offset": LIQUIDITY_STATE_LAYOUT_V4.offsetOf('swapQuoteInAmount').toString(), // Hack to filter for only new tokens. There is probably a better way to do this
              "bytes": Uint8Array.from([0])
            }
          },
          {
            "memcmp": {
              "offset": LIQUIDITY_STATE_LAYOUT_V4.offsetOf('swapBaseOutAmount').toString(), // Hack to filter for only new tokens. There is probably a better way to do this
              "bytes": Uint8Array.from([0])
            }
          }

        ],
        "owner": ["675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"] // raydium program id to subscribe to
      }
    },
    "transactions": {},
    "blocks": {},
    "blocksMeta": {},
    "accountsDataSlice": [],
    "commitment": CommitmentLevel.PROCESSED,  // Subscribe to processed blocks for the fastest updates
    entry: {}
  }

  // Sending a subscription request.
  await new Promise<void>((resolve, reject) => {
    stream.write(request, (err: null | undefined) => {
      if (err === null || err === undefined) {
        resolve();
      } else {
        reject(err);
      }
    });
  }).catch((reason) => {
    throw reason;
  });
}

async function checkIfTokenIsFrozen(mintAddress: PublicKey, connection: Connection) {
  const mintInfo = await connection.getParsedAccountInfo(mintAddress);

  if (mintInfo.value) {
    const accountData = mintInfo.value.data;

    // Check if accountData is of type ParsedAccountData
    if ('parsed' in accountData) {
      const freezeAuthority = accountData.parsed.info.freezeAuthority;
      if (freezeAuthority) {
        return true
      } else {
        return false
      }
    } else {
      console.log('Account data is not parsed or is a Buffer.');
    }
  } else {
    console.log('Mint account not found.');
  }
}

async function getTokenHolders(conn: Connection, MINT: PublicKey) {
  const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
  const TOKEN_ACC_SIZE = 165;
  const accs = await conn.getProgramAccounts(TOKEN_PROGRAM_ID, { dataSlice: { offset: 64, length: 8 }, filters: [{ dataSize: TOKEN_ACC_SIZE }, { memcmp: { offset: 0, bytes: MINT.toBase58() } }] });

  // Filter out zero balance accounts
  const nonZero = accs.filter((acc) => !acc.account.data.equals(Buffer.from([0, 0, 0, 0, 0, 0, 0, 0])));
  return nonZero.length
}

async function getInitialPoolSize(pair: PublicKey) {
  const connection = new Connection(RPC_ENDPOINT, "confirmed");
  let signatures = await connection.getSignaturesForAddress(pair);
  while (true) {
    signatures = await connection.getSignaturesForAddress(pair);
    if (signatures[signatures.length - 1] != undefined) {
      break;
    }
  }
  const add_signature = signatures[signatures.length - 1].signature
  const add_transaction = await connection.getParsedTransaction(add_signature, { maxSupportedTransactionVersion: 0 })
  let size = 0;
  add_transaction?.meta?.logMessages?.map((message) => {
    if (message.includes("init_pc_amount")) {
      const data = message.split(",")
      data.map((item) => {
        if (item.includes("init_pc_amount")) {
          size = Number(item.split(":")[1]) / 1e9
        }
      })
    }
  });
  return size
}

function logTokenInfo(initialPoolSize: number, currentPoolSize: number, mintAddress: string) {
  const mintLogMessage = `${new Date().toISOString()} : Token mint->https://gmgn.ai/sol/token/${mintAddress}`
  const initialPoolSizeLogMessage = `${new Date().toISOString()} : Initial pool size->${initialPoolSize} https://gmgn.ai/sol/token/${mintAddress}`
  const currentPoolSizeLogMessage = `${new Date().toISOString()} : Current pool size->${initialPoolSize} https://gmgn.ai/sol/token/${mintAddress}`
  logStream.write(mintLogMessage + '\n');
  logStream.write(initialPoolSizeLogMessage + '\n');
  logStream.write(currentPoolSizeLogMessage + '\n');
  logger.info(`Initial pool size->${initialPoolSize}`);
  logger.info(`Current pool size->${currentPoolSize}`);
}