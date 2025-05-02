import { loadConfiguration } from "./loadConfiguration";
import { JsonConfig } from "./customInterfaces";
import { Connection, clusterApiUrl, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { buyTokenWithSol } from "./executeTransaction";
import dotenv from 'dotenv';
dotenv.config();

const WEBSOCKET_URL = process.env.WEBSOCKET_URL || "wss://mainnet.helius-rpc.com/?api-key=9bcec464-2656-4c9b-ade1-aec940991301";
const RPC_URL = process.env.RPC_URL || clusterApiUrl("mainnet-beta");
const connection = new Connection(RPC_URL, 'confirmed');
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
            let raydium = false;
            let mintAddress = "";
            config.wallets[index].tokenAddress.map((token, index) => {
                if (logs.some(log => log.includes(token))){
                    including = true;
                    mintAddress = token;
                } else if (
                    logs.some(log => [
                        "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C",
                        "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",       // Raydium
                        "5quBtoiQqxF9Jv6KYKctB59NT3gtJD2Y65kdnB1Uev3h",
                        "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
                        "RVKd61ztZW9L92o7aLbCBzTuhBzqg9dGLBDK2P5gG7i",
                        "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                        "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",        // pump.fun
                        "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo",        // meteora
                        "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",        // Orca   
                    ].some(address => log.includes(address)))
                ) {
                    raydium = true;
                }
            });
            console.log(including, raydium);
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
                    // buyTokenWithSol(mintAddress, config.wallets[index].amount);
                }
                else if (postAmount<preAmount){
                    console.log(`💳selling...\npreAmount: ${preAmount}\npostAmount: ${postAmount}`);
                }
            } else if (raydium) {
                const tx = await connection.getParsedTransaction( logInfo.signature, { maxSupportedTransactionVersion: 0, commitment: "confirmed", });
                if (!tx || !tx.transaction.message) return;
                const instructions = tx.transaction.message.instructions;
                for (const instr of instructions){
                    if ("programId" in instr && "parsed" in instr){
                        const parsed = instr.parsed;
                        console.log(parsed);
                        
                    }
                }
            } else { console.log("🦐"); }
        } catch (error) {
            console.error("Error in log listener:", error);
        }
    }, "confirmed");
}