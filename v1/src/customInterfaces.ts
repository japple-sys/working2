export interface JsonConfig {
    wallets: JsonWallet[];
}
export interface JsonWallet {
    walletName: string;
    walletAddress: string;
    tokenAddress: string[];
    amount: number;
    takeProfit: number;
    stopLoss: number;
}
export interface JsonTrades {
    trades: JsonTrade[];
}
export interface JsonTrade {
    tokenAddress: string;
    boughtAmount:number;
    BuyAt: string | null;
    SellAt: string | null;
    Initialinvest: number;
    BuyFees: number | null;
    SellFees: number | null;
    SwapBuyFees: number | null;
    SwapSellFees: number | null;
    PNL: number | null;
    isConfirmed: boolean;
}