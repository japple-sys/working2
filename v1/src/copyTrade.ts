interface TradeSetting {
    walletName: string;
    walletAddress: string;
    tokenArray: string[];
    amount: number;
    maxProfit: number;
    lossLimit: number;
}

async function copyTrade(walletAddress:string) {
    const tradeSetting = await getSetting(walletAddress);
    copyBuy(walletAddress, tradeSetting.tokenArray, tradeSetting.amount);
    tradeSetting.tokenArray.map(async (tokenAddress) => {
        const HASTOKEN = await hasToken(walletAddress, tokenAddress);
        if(HASTOKEN){
            autoSell(tokenAddress, tradeSetting.maxProfit, tradeSetting.lossLimit);
        }
    })
}

async function copyBuy(walletAddress:string, tokenArray:string[], buyAmount:number) { }

async function autoSell(tokenAddress:string, maxProfit:number, lossLimit:number) {
    subscribePrice(tokenAddress);
    takeProfit(tokenAddress, maxProfit);
    stopLoss(tokenAddress, lossLimit);
}

async function subscribePrice(tokenAddress:string) { }

async function takeProfit(tokenAddress:string, maxProfit:number) {}
async function stopLoss(tokenAddress:string, lossLimit:number) {}
async function getSetting(walletAddress:string):Promise<TradeSetting> {
    const tradeSetting:TradeSetting = {
        walletName: "Trading Wallet 1",
        walletAddress: "7xKXtDG3GKqh9QjFfxUCRbqKrSFNhDRhmTCzRRKMwNti",
        tokenArray: ["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v","Feo67oCcJ2DXmvjbacDDyDK4jCwM26nksbT6Cf2Rpump"],
        amount: 0.1,
        maxProfit: 5,
        lossLimit: 2
    };
    return tradeSetting;
}
async function hasToken(walletAddress:string, tokenAddress:string):Promise<Boolean> {
    let status:Boolean = false;
    return status;
}