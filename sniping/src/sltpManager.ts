import { sellToken } from './executeTransaction';
require('mongoose').connect("mongodb://localhost:27017/sniping");
const Snipingtokens = require('./models/snipingtokens');
const Specsnipes = require("./models/specsnipes");

async function sltpManager() {
    try {
        // Fetch all tokens from the database
        const tokens = await Snipingtokens.find();
        const specSnipes = await Specsnipes.find({ status: "sniping" });
        const validTokens = tokens.filter((item: { mintAddr: string; }) => item.mintAddr && item.mintAddr.trim() !== '');
        const mergedMintAddresses = validTokens.map((item: { mintAddr: any; }) => item.mintAddr).join(',');
        // const mergedMintAddresses = tokens.map((item: { mintAddr: String; }) => item.mintAddr).join(',');
        // console.log('Tokens:', mergedMintAddresses);
        const solAddress = "So11111111111111111111111111111111111111112"
        const priceResponseShowExtraInfo = await fetch( 
            `https://api.jup.ag/price/v2?ids=${solAddress},${mergedMintAddresses}&showExtraInfo=true`
        );
        const priceDataShowExtraInfo = await priceResponseShowExtraInfo.json();
        specSnipes.map((snipe: any) => {
            const tpSolAmount = snipe.snipeAmount * snipe.takeProfit/100; 
            // console.log(tpSolAmount);
            const slSolAmount = snipe.snipeAmount * (100 - snipe.stopLoss)/100; 
            // console.log(slSolAmount);
            const solPrice = parseFloat(priceDataShowExtraInfo.data[solAddress]?.price);  
            const tokenPrice = parseFloat(priceDataShowExtraInfo.data[snipe.mintAddr]?.price); 
            const expectedProfit = tokenPrice/solPrice*snipe.tokenAmount; 
            // console.log(expectedProfit)
            if (expectedProfit > tpSolAmount) { 
                console.log(`📈take profit\n${snipe}`);
                // sellToken(snipe.mintAddr, snipe.tokenAmount);

            }
            else if (expectedProfit < slSolAmount ) { 
                console.log(`📉stop loss\n${snipe}`);
            }
        });
    } catch (error) {
        console.error('Error fetching tokens:', error);
    }
} 
function regular() {
    setInterval(sltpManager, 500);
}
regular();

async function tp2db(snipe:any) {
    
}