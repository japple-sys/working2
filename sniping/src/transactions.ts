import { getResponse, getSwapTransaction } from "./jupiterService";
import { Connection, LAMPORTS_PER_SOL, VersionedTransaction, ComputeBudgetProgram  } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import { Wallet } from "@project-serum/anchor";
import * as fs from 'fs';
// import { JsonTrade, JsonTrades } from "./customInterfaces";

export const executeTransaction = async (
    connection: Connection,
    swapTransaction: any,
    anchorWallet: Wallet
) => {
    let txid, signature;
    const swapTransactionBuf = Buffer.from(swapTransaction, "base64");
    const latestBlockHash = await connection.getLatestBlockhash();
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
    transaction.message.recentBlockhash = latestBlockHash.blockhash;
    transaction.sign([anchorWallet.payer]);
    try {
        const rawTransaction = transaction.serialize();
        txid = await connection.sendRawTransaction(rawTransaction, {
            skipPreflight: false,
            maxRetries: 5,
        });
        signature = await connection.confirmTransaction({
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
            signature: txid,
        });
        return {
            confirm: true,
            signature: txid,
        };
    } catch (error) {
        console.log("error", error);
        console.log("Transaction reconfirm after 10s!");
        await new Promise((resolve) => setTimeout(resolve, 10000));
        return {
            confirm: false,
            signature: "",
        };
    }
};

export const getTransaction = async (
    wallet: Wallet,
    tokenAddress: string,
    buyAmount: number,
    slippageBps: number,
    decimals: number,
) => {
    try {
        const buyQuoteResponse = await getResponse(
            NATIVE_MINT.toBase58(),
            tokenAddress,
            buyAmount * LAMPORTS_PER_SOL,
            slippageBps
        );
        // fs.readFile("ct_active_trades.json", 'utf8', (err, data) => {
        //     if (err) {
        //         console.error('Error reading the file:', err);
        //         return;
        //     }
        //     const existingData: JsonTrades = JSON.parse(data);
        //     console.log("📖transaction: ",buyQuoteResponse.routePlan[0].swapInfo);
        //     const newTrade: JsonTrade = {
        //         tokenAddress: tokenAddress,
        //         boughtAmount: buyQuoteResponse.routePlan[0].swapInfo.outAmount,
        //         BuyAt: null,
        //         SellAt: null,
        //         Initialinvest: buyAmount,
        //         BuyFees: 0.0001,
        //         SellFees: null,
        //         SwapBuyFees: buyQuoteResponse.routePlan[0].swapInfo.feeAmount,
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
        const swapTransaction = await getSwapTransaction(
            buyQuoteResponse,
            wallet
        );
        return swapTransaction;
    } catch (error) {
        console.log("error", error);
        return null;
    }
};
export const getSellTransaction = async (
    wallet: Wallet,
    tokenAddress: string,
    sellAmount: number,
    slippageBps: number,
    decimals: number,
    ) => {
        try {
            const buyQuoteResponse = await getResponse(
                tokenAddress,
                NATIVE_MINT.toBase58(),
                sellAmount,
                slippageBps
            );
            // fs.readFile("ct_active_trades.json", 'utf8', (err, data) => {
            //     if (err) {
            //         console.error('Error reading the file:', err);
            //         return;
            //     }
            //     const existingData: JsonTrades = JSON.parse(data);
            //     console.log("📖transaction: ",buyQuoteResponse.routePlan[0].swapInfo);
            //     const trade = existingData.trades.find(t => t.tokenAddress === tokenAddress);
            //     if (trade) {
            //         trade.SwapSellFees = buyQuoteResponse.routePlan[0].swapInfo.feeAmount;
            //     }
            //     fs.writeFile("ct_active_trades.json", JSON.stringify(existingData, null, 2), 'utf8', (err) => {
            //         if (err) {
            //             console.error('Error writing to the file:', err);
            //             return;
            //         }
            //         console.log('New trade added successfully!');
            //     });
            // });
            const swapTransaction = await getSwapTransaction(
                buyQuoteResponse,
                wallet
            );
            return swapTransaction;
        } catch (error) {
            console.log("error", error);
            return null;
        }
};
export const signTransaction = async (connection: Connection, transaction: any, wallet: Wallet): Promise<VersionedTransaction> => {
    const swapTransactionBuf = Buffer.from(transaction, "base64");
    const latestBlockHash = await connection.getLatestBlockhash();
    const tx = VersionedTransaction.deserialize(swapTransactionBuf);
    // console.log({ transaction });
    tx.message.recentBlockhash = latestBlockHash.blockhash;
    tx.sign([wallet.payer]);
    return tx;
};
