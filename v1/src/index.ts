import { loadConfiguration } from "./loadConfiguration";
import { JsonConfig } from "./customInterfaces";
import { Connection, clusterApiUrl, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { buyTokenWithSol, sellToken } from "./executeTransaction";
import * as fs from 'fs';
import { JsonTrade, JsonTrades } from "./customInterfaces";
import axios from "axios";
import dotenv from 'dotenv';
dotenv.config();

const WEBSOCKET_URL = process.env.WEBSOCKET_URL || "wss://mainnet.helius-rpc.com/?api-key=9bcec464-2656-4c9b-ade1-aec940991301";
const RPC_URL = process.env.RPC_URL || clusterApiUrl("mainnet-beta");
const connection = new Connection(RPC_URL, 'confirmed');
const TAKE_PROFIT = Number(process.env.TAKE_PROFIT) || 0.0001;
const STOP_LOSS = Number(process.env.STOP_LOSS) || 0.0001;
// Test the function
loadConfiguration().then((config) => {
    console.log(config);
    // Here come main function                                                                                                                                                                                                                                                                                                                                                    
    config.wallets.map((wallet,index)=> {
        walletMonitoring(wallet.walletAddress, config, index);
    });
}).catch((error) => {
    console.error(error);
});

async function walletMonitoring(walletAddr:string, config:JsonConfig, index:number) {
    console.log("Listening for trader's transactions...");
    connection.onLogs(new PublicKey(walletAddr), async (logInfo) => {
        try {
            if (logInfo.err) return;
            const logs = logInfo.logs;
            console.log(logInfo);
            let including = false;
            let usingDex = "";
            let mintAddress = "";
            config.wallets[index].tokenAddress.map((token, index) => {
                if (logs.some(log => log.includes(token))){
                    including = true;
                    mintAddress = token;
                } else if (logs.some(log => log.includes("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"))){
                    usingDex = "pumpfun";
                } else if (logs.some(log => log.includes("LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"))) {
                    usingDex = "mereora";
                } else if (logs.some(log => log.includes("whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc"))) {
                    usingDex = "orca";
                } else if (logs.some(log => [
                    "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C",
                    "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
                    "5quBtoiQqxF9Jv6KYKctB59NT3gtJD2Y65kdnB1Uev3h",
                    "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
                    "RVKd61ztZW9L92o7aLbCBzTuhBzqg9dGLBDK2P5gG7i",
                    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                ].some(address => log.includes(address)))) {
                    usingDex = "raydium";
                }
            });
            console.log(including, usingDex);
            if (including){
                console.log("🐋");
                const tx = await connection.getParsedTransaction( logInfo.signature, { maxSupportedTransactionVersion: 0, commitment: "confirmed", });
                if (!tx || !tx.transaction.message) return;
                const preInfo = tx.meta?.preTokenBalances;
                const postInfo = tx.meta?.postTokenBalances;
                const preTokenInfo = preInfo?.find(item=>item.owner === walletAddr && item.mint === mintAddress);
                const postTokenInfo = postInfo?.find(item=>item.owner === walletAddr && item.mint === mintAddress);
                const preAmount = preTokenInfo?.uiTokenAmount.uiAmount || 0;
                const postAmount = postTokenInfo?.uiTokenAmount.uiAmount || 0;
                if (postAmount>preAmount){
                    console.log(`💳buying...\npreAmount: ${preAmount}\npostAmount: ${postAmount}`);
                    fs.readFile("ct_active_trades.json", 'utf8', (err, data) => {
                        if (err) {
                            console.error('Error reading the file:', err);
                            return;
                        }
                        const existingData: JsonTrades = JSON.parse(data);
                        const trade = existingData.trades.find(t => t.tokenAddress === mintAddress);
                        if (!trade) {
                            buyTokenWithSol(mintAddress, config.wallets[index].amount);
                        } else {
                            console.log("🧯 Current Token order is opening");
                        }
                    });
                }
                else if (postAmount<preAmount){
                    console.log(`💳selling...\npreAmount: ${preAmount}\npostAmount: ${postAmount}`);
                }
            } else if ([
                "pumpfun", "mereora", "orca", "raydium"
            ].some(dex => dex === usingDex)) {
                const tx = await connection.getParsedTransaction( logInfo.signature, { maxSupportedTransactionVersion: 0, commitment: "confirmed", });
                if (!tx || !tx.transaction.message) return;
                const instructions = tx.transaction.message.instructions;
                for (const instr of instructions){
                    if ("programId" in instr && "parsed" in instr){
                        const parsed = instr.parsed;
                        console.log(parsed);
                        const source = parsed.info?.source;
                        const destination = parsed.info?.destination;
                        const lpAddress = parsed.info?.pool;
                        console.log(source, destination, lpAddress);
                        console.log(tx.transaction.message.accountKeys);
                    }
                }
            } else { console.log("🦐"); }
        } catch (error) {
            console.error("Error in log listener:", error);
        }
    }, "confirmed");
}

const getSellInfo = async () => {
    fs.readFile("ct_active_trades.json", 'utf8', async (err, data) => {
        if (err) {
            console.error('Error reading the file:', err);
            return;
        }
        const existingData: JsonTrades = JSON.parse(data);
        const trades = existingData.trades;
        if (trades.length){
            let mergedTargetTokens = "So11111111111111111111111111111111111111112";
            trades.map(trade => {
                mergedTargetTokens += `,${trade.tokenAddress}`;
                // const tokenA = trade.tokenAddress;
                // const amount = trade.boughtAmount;
                // const tokenB = "So11111111111111111111111111111111111111112";
                // const slippageBps = 50;
                // const res = await axios.get(`https://quote-api.jup.ag/v6/quote?inputMint=${tokenA}&outputMint=${tokenB}&amount=${amount}&slippageBps=${slippageBps}`);
                // const sellinfo = res.data;
                // let profit = (sellinfo.routePlan[0]["swapInfo"].outAmount - trade.Initialinvest*1e9)/1e9;
                // if (profit > 0.000001){ console.log(`Please sell ${tokenA} to take profit: ${profit} sol`)}
            });
            
            const priceResponseShowExtraInfo = await fetch( `https://api.jup.ag/price/v2?ids=${mergedTargetTokens}&showExtraInfo=true`);
            const priceDataShowExtraInfo = await priceResponseShowExtraInfo.json();
            trades.map(trade => {
                const solPrice = priceDataShowExtraInfo.data["So11111111111111111111111111111111111111112"]?.price;
                // console.log("solPrice: ",solPrice);
                const tokenPrice = Number(priceDataShowExtraInfo.data[trade.tokenAddress]?.price);
                // console.log("tokenPrice: ",tokenPrice, typeof(tokenPrice));
                let profit = (tokenPrice/solPrice*trade.boughtAmount-trade.Initialinvest*1e9)/1e9;
                let loss = (trade.Initialinvest*1e9 - tokenPrice/solPrice*trade.boughtAmount)/1e9;
                // console.log(`Sell ${trade.tokenAddress} to take profit ${profit} sol`);
                if (profit > TAKE_PROFIT){
                    console.log(`Selling... ${trade.tokenAddress} to take profit ${profit} sol`);
                    sellToken(trade.tokenAddress);
                } else if (loss > STOP_LOSS) {
                    console.log(`Selling... ${trade.tokenAddress} to stop loss ${loss} sol`);
                    sellToken(trade.tokenAddress);
                }
            })
        } else {
            console.log("No active trade...")
        }
    });
};
async function sltp() {
    setInterval(getSellInfo, 500);
}
sltp();