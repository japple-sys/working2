import { Wallet } from "@project-serum/anchor";
import axios from "axios";

export const getResponse = async (tokenA: string, tokenB: string, amount: number, slippageBps: number) => {
    const response = await axios.get(`https://quote-api.jup.ag/v6/quote?inputMint=${tokenA}&outputMint=${tokenB}&amount=${amount}&slippageBps=${slippageBps}`);
    const quoteResponse = response.data;
    return quoteResponse;
};

export const getSwapInfo = async (tokenA: string, tokenB: string, amount: number, slippageBps: number) => {
    const res = await axios.get(`https://quote-api.jup.ag/v6/quote?inputMint=${tokenA}&outputMint=${tokenB}&amount=${amount}&slippageBps=${slippageBps}`);
    const swapinfo = res.data;
    return swapinfo;
};

export const getSwapTransaction = async (quoteResponse: any, anchorWallet: Wallet) => {
    const swapResponse = await axios.post(`https://quote-api.jup.ag/v6/swap`, {
        quoteResponse,
        userPublicKey: anchorWallet.publicKey.toString(),
        wrapAndUnwrapSol: true,
        prioritizationFeeLamports: 200000, // or custom lamports: 1000
    });
    return swapResponse.data.swapTransaction;
};
