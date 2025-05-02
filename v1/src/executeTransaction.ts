import { clusterApiUrl, Keypair, Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import readline from "readline";
import { getTokenDecimals, getSPLBalance } from "./utils";
import { getSwapInfo } from "./jupiterService";
import { NATIVE_MINT } from "@solana/spl-token";
import { executeTransaction, getTransaction, signTransaction, getSellTransaction } from "./transactions";
import { getJitoBundle, sendBundle } from "./jitoService";
import { Wallet } from "@project-serum/anchor";
import * as fs from 'fs';
import { JsonTrade, JsonTrades } from "./customInterfaces";

import dotenv from "dotenv";
dotenv.config();
export const buyTokenWithSol = async (mintAddress:string, buyAmount:number) => {
    const RPC_URL = process.env.RPC_URL;
    if (!RPC_URL) { throw new Error("RPC_URL is not defined in the environment variables."); }
    const buyerWallet = process.env.PRIVATE_KEY;
    if (!buyerWallet) { throw new Error("PRIVATE_KEY is not defined in the environment variables."); }
    const connection = new Connection(RPC_URL, "confirmed");
    const TOKEN_ADDRESS = mintAddress; console.log("token_address in buyfunction: ",TOKEN_ADDRESS);
    const amount = buyAmount; console.log("amount",amount);
    const tokenDecimals = await getTokenDecimals(connection, TOKEN_ADDRESS); console.log("token decimal: ", tokenDecimals);
    const slippageBps = parseInt(process.env.SLIPPAGEBPS || "50");
    if (!slippageBps) { throw new Error("SLIPPAGEBPS is not defined in the environment variables."); }
    let success = false;

    while (success == false) {
        const buyer = Keypair.fromSecretKey(bs58.decode(buyerWallet));
        const buyerAnchorWallet = new Wallet(buyer);
        // const swapinfo = await getSwapInfo(
        //     NATIVE_MINT.toBase58(),
        //     TOKEN_ADDRESS,
        //     parseFloat(amount) * LAMPORTS_PER_SOL,
        //     slippageBps
        // );
        const transaction = await getTransaction(
            buyerAnchorWallet,
            TOKEN_ADDRESS,
            amount,
            slippageBps,
            tokenDecimals
        ); 
        if (transaction == null) {
            console.log("transaction is null");
            continue;
        } 
        // fs.readFile("ct_active_trades.json", 'utf8', (err, data) => {
        //     if (err) {
        //         console.error('Error reading the file:', err);
        //         return;
        //     }
        //     const existingData: JsonTrades = JSON.parse(data);
        //     console.log("transaction: ",transaction);
        //     const newTrade: JsonTrade = {
        //         tokenAddress: TOKEN_ADDRESS,
        //         BuyAt: null,
        //         SellAt: null,
        //         Initialinvest: amount,
        //         BuyFees: null,
        //         SellFees: null,
        //         SwapBuyFees: null,
        //         SwapSellFees: null,
        //         PNL: null,
        //         isConfirmed: false
        //     };
        //     existingData.trades.push(newTrade);
        //     fs.writeFile("ct_active_trades.json", JSON.stringify(existingData, null, 2), 'utf8', (err) => {
        //         if (err) {
        //             console.error('Error writing to the file:', err);
        //             return;
        //         }
        //         console.log('New trade added successfully!');
        //     });
        // });
        const signedTx = await signTransaction(
            connection,
            transaction,
            buyerAnchorWallet
        ); //console.log("signedTx:", signedTx);
        let bundleResult;
        try {
            bundleResult = await sendBundle(connection, signedTx);
            success = true;
            fs.readFile("ct_active_trades.json", 'utf8', (err, data) => {
                if (err) {
                    console.error('Error reading the file:', err);
                    return;
                }
                const existingData: JsonTrades = JSON.parse(data);
                const trade = existingData.trades.find(t => t.tokenAddress === TOKEN_ADDRESS);
                if (trade) {
                    trade.isConfirmed = true;
                    trade.BuyAt = new Date().toLocaleTimeString();
                }
                fs.writeFile("ct_active_trades.json", JSON.stringify(existingData, null, 2), 'utf8', (err) => {
                    if (err) {
                        console.error('Error writing to the file:', err);
                        return;
                    }
                    console.log('New trade added successfully!');
                });
            });
        } catch (error) {
            console.log("error:", error);
            console.log("--------------------Continue to next--------------:");
            await new Promise((resolve) => setTimeout(resolve, 10000));
        }
    }
};

export const sellToken = async(mintAddress:string) => {
    const RPC_URL = process.env.RPC_URL;
    if (!RPC_URL) { throw new Error("RPC_URL is not defined in the environment variables."); }
    const sellerWallet = process.env.PRIVATE_KEY;
    if (!sellerWallet) { throw new Error("PRIVATE_KEY is not defined in the environment variables."); }
    const slippageBps = parseInt(process.env.SLIPPAGEBPS || "") || 50;
    if (!slippageBps) { throw new Error("SLIPPAGEBPS is not defined in the environment variables."); }
    const connection = new Connection(RPC_URL, "confirmed");
    const TOKEN_ADDRESS = mintAddress; console.log("token_address in buyfunction: ",TOKEN_ADDRESS);
    const tokenDecimals = await getTokenDecimals(connection, TOKEN_ADDRESS);
    let success = false;
    while (success == false) {
        const seller = Keypair.fromSecretKey(bs58.decode(sellerWallet));
        const sellerAnchorWallet = new Wallet(seller);
        const amount = await getSPLBalance(connection, new PublicKey(mintAddress), sellerAnchorWallet.publicKey);
        if (amount == 0) {console.log("no token"); break;}
        else {
            // const swapinfo = await getSwapInfo(TOKEN_ADDRESS, NATIVE_MINT.toBase58(), amount*(10**tokenDecimals), slippageBps);
            const transaction = await getSellTransaction(
                sellerAnchorWallet,
                TOKEN_ADDRESS,
                amount*(10**tokenDecimals),
                slippageBps,
                tokenDecimals,
            ); 
            if (transaction == null) { console.log("transaction is null"); continue; }
            const signedTx = await signTransaction(
                connection,
                transaction,
                sellerAnchorWallet
            );
            let bundleResult;
            try {
                bundleResult = await sendBundle(connection, signedTx);
                success = true;
                fs.readFile("ct_active_trades.json", 'utf8', (err, data) => {
                    if (err) {
                        console.error('Error reading the file:', err);
                        return;
                    }
                    const existingData: JsonTrades = JSON.parse(data);
                    // const trade = existingData.trades.find(t => t.tokenAddress === TOKEN_ADDRESS);
                    const tradeIndex = existingData.trades.findIndex(t => t.tokenAddress === TOKEN_ADDRESS);
                    if (tradeIndex !== -1){
                        const [foundTrade] = existingData.trades.splice(tradeIndex, 1);
                        foundTrade.SellAt = new Date().toLocaleTimeString();
                        fs.writeFile("ct_active_trades.json", JSON.stringify(existingData, null, 2), 'utf8', (err) => {
                            if (err) {
                                console.error('Error writing to the active trades file:', err);
                                return;
                            }
                            console.log('Trade removed from active trades successfully!');
                        });
                        fs.readFile("ct_completed_trades.json", 'utf8', (err, data) => {
                            if (err) {
                                console.error('Error reading the completed trades file:', err);
                                return;
                            }
                            const completedTrades = JSON.parse(data); 
                            completedTrades.trades.push(foundTrade);
                            fs.writeFile("ct_completed_trades.json", JSON.stringify(completedTrades, null, 2), 'utf8', err => {
                                if (err) {
                                    console.error('Error writing to the completed trades file:', err);
                                    return;
                                }
                                console.log('Trade added to completed trades successfully!');
                            });
                        });
                    } else {
                        console.log('No matching trade found in active trades.');
                    }
                });
            } catch (error) {
                console.log("error:", error);
                console.log("--------------------Continue to next--------------:");
                await new Promise((resolve) => setTimeout(resolve, 10000));
            }
        }
    }
}