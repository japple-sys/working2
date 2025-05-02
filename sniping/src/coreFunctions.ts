require('mongoose').connect("mongodb://localhost:27017/sniping");
import { buyTokenWithSol } from "./executeTransaction";

const User = require('./models/user');
const Specsnipes = require('./models/specsnipes');
const Snipingtokens = require('./models/snipingtokens');

export async function createSpecSnipe(mintAddr:string, takeProfit:number, stopLoss:number, slippage:number, snipeAmount:number, userId:number) {
    // get user setting for specific snipe
    // buy token
    buyTokenWithSol(mintAddr, snipeAmount);
    const tokenAmount:Number = 151455135;
    const buyTx:String = "2fa9A7ABKdJuPco9fJJ17P5pKdsn3FPMssvyewi7dX776BrjwPc58DoFSPsKMjs1NpAaEvfgEq9WCTkhb5ktU6mP";
    const status:String = "sniping" // paused || success || failed 
    
    // record to specsnipes model
    Specsnipes.create({userId, mintAddr, takeProfit, stopLoss, slippage, snipeAmount, tokenAmount, buyTx, status}).then((snipe: any) => {
        console.log(snipe);
    });
    const existingToken = await Snipingtokens.findOne({ mintAddr });
    if (!existingToken){
        Snipingtokens.create({mintAddr}).then((token: any) => console.log(token));
    } else {
        console.log("token already exist");
    }
}