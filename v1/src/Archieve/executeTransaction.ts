import { SystemProgram, Keypair, Connection, PublicKey, VersionedTransaction, TransactionMessage } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import bs58 from "bs58";
import { Wallet } from "@project-serum/anchor";
import axios from "axios";
import dotenv from 'dotenv';
dotenv.config();

const RPC_URL = process.env.RPC_URL;
const BLOCK_ENGINE_URL = "https://frankfurt.mainnet.block-engine.jito.wtf"
if (!RPC_URL) { throw new Error("RPC_URL is not defined in the environment variables."); }
const SIGNERWALLET = process.env.PRIVATE_KEY;
const SLIPPAGEBPS = parseInt(process.env.SLIPPAGEBPS || "50");
const TIP_ACCOUNTS = [
    "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
    "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
    "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
    "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
    "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
    "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
    "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
    "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT",
].map((pubkey) => new PublicKey(pubkey));
const connection = new Connection(RPC_URL, "confirmed"); 

export async function buyTokenWithSol(mintAddress:string, buyAmount:number) {
    if (!SIGNERWALLET) { throw new Error("PRIVATE_KEY is not defined in the environment variables."); }
    let success = false;
    while (success == false){
        const SIGNER = Keypair.fromSecretKey(bs58.decode(SIGNERWALLET));
        const buyerAnchorWallet = new Wallet(SIGNER);
        axios.get(`https://quote-api.jup.ag/v6/quote?inputMint=${NATIVE_MINT.toBase58()}&outputMint=${mintAddress}&amount=${buyAmount}&slippageBps=${SLIPPAGEBPS}`).then(res=>{
            const swapinfo = res.data;
            axios.post(`https://quote-api.jup.ag/v6/swap`, {
                // quoteResponse from /quote api
                swapinfo,
                // user public key to be used for the swap
                userPublicKey: buyerAnchorWallet.publicKey.toString(),
                // auto wrap and unwrap SOL. default is true
                wrapAndUnwrapSol: true,
                // dynamicComputeUnitLimit: true, // allow dynamic compute limit instead of max 1,400,000
                prioritizationFeeLamports: 200000, // or custom lamports: 1000
                // dynamicSlippage: { maxBps: 300 },
                // feeAccount is optional. Use if you want to charge a fee.  feeBps must have been passed in /quote API.
                // feeAccount: "fee_account_public_key"
            }).then(res => {
                const swapTx = res.data.swapTransaction;
                const swapTransactionBuf = Buffer.from(swapTx, "base64");
                connection.getLatestBlockhash().then(latestBlockHash=>{
                    const tx = VersionedTransaction.deserialize(swapTransactionBuf);
                    tx.message.recentBlockhash = latestBlockHash.blockhash;
                    tx.sign([buyerAnchorWallet.payer]);
                    sendBundle(connection, tx);
                })
            })
        });
    }
}

async function sendBundle(connection: Connection, signedTransaction: VersionedTransaction){
    if (!SIGNERWALLET) { throw new Error("PRIVATE_KEY is not defined in the environment variables."); }
    try{
        const { blockhash } = await connection.getLatestBlockhash("finalized");
        const tipAccount = TIP_ACCOUNTS[Math.floor(Math.random() * TIP_ACCOUNTS.length)];
        const instruction1 = SystemProgram.transfer({
            fromPubkey: Keypair.fromSecretKey(bs58.decode(SIGNERWALLET)).publicKey,
            toPubkey: tipAccount,
            lamports: 100000,
        });
        const messageV0 = new TransactionMessage({
            payerKey: Keypair.fromSecretKey(bs58.decode(SIGNERWALLET)).publicKey,
            instructions: [instruction1],
            recentBlockhash: blockhash,
        }).compileToV0Message();
        const vTxn = new VersionedTransaction(messageV0);
        // const signatures = [signedTransaction, vTxn].map((signedTx) => {
        //     return bs58.encode(signedTx.signatures[0]);
        // });
        vTxn.sign([Keypair.fromSecretKey(bs58.decode(SIGNERWALLET))]);
        const encodedTx = [signedTransaction, vTxn].map((tx) =>
            bs58.encode(tx.serialize())
        );
        const jitoURL = `${BLOCK_ENGINE_URL}/api/v1/bundles`;
        const payload = {
            jsonrpc: "2.0",
            id: 1,
            method: "sendBundle",
            params: [encodedTx],
        };
        try {
            const response = await axios.post(jitoURL, payload, {
                headers: { "Content-Type": "application/json" }
            });
            return response.data.result;
        } catch (error) {
            console.error("cannot send!:", error);
            return null;
        }
    } catch (err:any) {
        console.error("Error sending bundle:", err.message);
        if (err?.message?.includes("Bundle Dropped, no connected leader up soon")) {
            console.error("Error sending bundle: Bundle Dropped, no connected leader up soon.");
        } else {
            console.error("An unexpected error occurred:", err.message);
        }
    }
}