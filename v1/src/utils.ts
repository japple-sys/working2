import axios from "axios";
// import {
//     parseTokenAccountResp,
//     parseTokenInfo,
// } from "@raydium-io/raydium-sdk-v2";
import {
    TOKEN_PROGRAM_ID,
    NATIVE_MINT,
    getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Connection, Keypair, PublicKey, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { Wallet } from "@project-serum/anchor";
const connection = new Connection(
    "https://staked.helius-rpc.com?api-key=1ee55724-e209-418c-94e0-01be00be7757",
    "confirmed"
);

export const getTokenInfo = async (tokenAddress: string) => {
    try {
        const response = await axios.get(
            `https://tokens.jup.ag/token/${tokenAddress}`
        );
        console.log("Token Information ", response.data);
        return response.data;
    } catch (error) {
        console.log("error", error);
    }
};

// export const getTokenAccountData = async (owner: Keypair) => {
//     const solAccountResp = await connection.getAccountInfo(owner.publicKey);
//     const tokenAccountResp = await connection.getTokenAccountsByOwner(
//         owner.publicKey,
//         { programId: TOKEN_PROGRAM_ID }
//     );
//     const tokenAccountData = parseTokenAccountResp({
//         owner: owner.publicKey,
//         solAccountResp,
//         tokenAccountResp: {
//             context: tokenAccountResp.context,
//             value: [...tokenAccountResp.value],
//             // value: [...tokenAccountResp.value, ...token2022Req.value],
//         },
//     });
//     return tokenAccountData;
// };


export const getSPLBalance = async (
    connection: Connection,
    mintAddress: PublicKey,
    pubKey: PublicKey,
    allowOffCurve = false
): Promise<number> => {
    try {
        let data = getAssociatedTokenAddressSync(
            mintAddress,
            pubKey,
            allowOffCurve
        );
        const balance = await connection.getTokenAccountBalance(data, "confirmed");
        return balance?.value?.uiAmount as number;
    } catch (e) {
        console.log("There is no token");
        return 0;
    }
};

export const getTokenDecimals = async (connection: Connection, tokenAddress: string) => {
    try {
        const tokenMint = new PublicKey(tokenAddress);
        const mintInfo = await connection.getParsedAccountInfo(tokenMint);
        if (!mintInfo.value) { console.log("Token mint not found."); return null; }
        const decimals = (mintInfo.value.data as any).parsed.info.decimals;
        return decimals;
    } catch (error) {
        console.error("Error fetching token decimals:", error);
        return null;
    }
};

export const executeTransaction = async (
    connection: Connection,
    swapTransaction: string,
    anchorWallet: Wallet
) => {
    let txid, signature;
    const swapTransactionBuf = Buffer.from(swapTransaction, "base64");
    const latestBlockHash = await connection.getLatestBlockhash();
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
    // console.log({ transaction });
    transaction.message.recentBlockhash = latestBlockHash.blockhash;
    transaction.sign([anchorWallet.payer]);
    // sign the transaction
    try {
        // Execute the transaction
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
