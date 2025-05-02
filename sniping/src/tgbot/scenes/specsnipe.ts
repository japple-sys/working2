import { Markup, Scenes } from "telegraf";
import { MyContext } from "../utils";

module.exports = class SpecsnipeScene {
    private snipeInfo:{ 
        userId:string, mintAddr:string, takeProfit:number|null, stopLoss:number|null, slippage:number|null, snipeFee: number|null, snipeTip: number|null,
        snipeAmount:number|null, tokenAmount:number|null, buyTx: string, sellTx: string, status: string, 
    };

    constructor() {
        this.snipeInfo = {
            userId: "", mintAddr: "", takeProfit: null, stopLoss: null, slippage: 50, snipeFee: null, snipeTip:null,
            snipeAmount: null, tokenAmount: null, buyTx: "", sellTx: "", status: ""
        };
    }

//     public btn_create_snipe = async (ctx:MyContext) => {
//         const textMsg = `🎯 Snipe Specific Token
// 🔷 Enter the token’s contract address into the bot.
// 🔷 The bot will monitor the launch and instantly execute your buy order when liquidity is added.
// 🔷 After purchase, the bot actively manages 📈Take Profit (TP) and 📉Stop Loss (SL) levels to lock in gains or minimize losses.\n
// 🤖 Auto Snipe
// 🔶 Let the bot do the work for you!
// 🔶 It scans for new token launches in real-time and automatically purchases tokens that meet your custom criteria.\n
// 🚀 Ready to snipe your next big opportunity?
// Choose your snipe mode and configure your settings to get started!`
//         const keyboard = [
//             [Markup.button.callback('Specific Token', 'btn_create_specsnipe'), Markup.button.callback('Auto Snipe', 'btn_back_autosnipe')],
//             [Markup.button.callback('🔙 Back', 'btn_snipe'), Markup.button.callback('❌ Close', 'btn_close_specsnipe')]
//         ];
//         ctx.state.username = ctx.from?.username;
//         console.log(ctx.state.username);
//         ctx.reply(textMsg, Markup.inlineKeyboard(keyboard));
//     }
    public btn_create_specsnipe = async (ctx:MyContext) => {
        const textMsg = `Please enter the token address you want to snipe.`;
        const keyboard = [
            [Markup.button.callback('🔙 Back', 'btn_create_snipe'), Markup.button.callback('❌ Close', 'btn_close_specsnipe')]
        ];
        ctx.reply(textMsg,Markup.inlineKeyboard(keyboard));
    }

    public btn_edit_slippage_specsnipe = new Scenes.WizardScene<MyContext>("btn_edit_slippage_specsnipe",
        async ctx => {
            await ctx.reply("Please enter the Slippage Amount value. (in %) - Example: 50");
            ctx.wizard.next();
        },
        async ctx => {
            if (ctx.message && 'text' in ctx.message) {
                this.snipeInfo.slippage = parseFloat(ctx.message.text);
            }
            const textMsg = `Token: ${this.snipeInfo.mintAddr} Information from BirdEye`;
            const keyboard = [
                [Markup.button.callback('🔃 Refresh', 'btn_refresh_specsnipe'), Markup.button.callback(`Slippage: ${this.snipeInfo.slippage}%✏`, 'btn_edit_slippage_specsnipe')],
                [Markup.button.callback(`Snipe fee: ${this.snipeInfo.snipeFee} SOL✏`, 'btn_edit_sinpefee_specsnipe'), Markup.button.callback(`Snipe tip: ${this.snipeInfo.snipeTip} SOL✏`, 'btn_edit_snipetip_specsnipe')],
                [Markup.button.callback(`🟢Take Profit (TP): ${this.snipeInfo.takeProfit}%`, 'btn_edit_takeprofit_specsnipe')],
                [Markup.button.callback(`🟢Stop Loss (SL): ${this.snipeInfo.stopLoss}%`, 'btn_edit_stoploss_specsnipe')],
                [Markup.button.callback(`Snipe 0.2 SOL`, 'btn_setamount_02_specsnipe'), Markup.button.callback(`Snipe 0.5 SOL`, 'btn_setamount_05_specsnipe')],
                [Markup.button.callback(`Snipe 1 SOL`, 'btn_setamount_1_specsnipe'), Markup.button.callback(`Snipe X SOL`, 'btn_setamount_x_specsnipe')],
                [Markup.button.callback(`❌ Close`, 'btn_close_specsnipe')],
            ];
            await ctx.reply(textMsg, Markup.inlineKeyboard(keyboard));
            ctx.scene.leave();
        }
    );

    public btn_edit_sinpefee_specsnipe = new Scenes.WizardScene<MyContext>("btn_edit_sinpefee_specsnipe",
        async ctx => {
            await ctx.reply("Please enter the Snipe Fee Amount value. (in SOL) - Example: 0.01");
            ctx.wizard.next();
        },
        async ctx => {
            if (ctx.message && 'text' in ctx.message) {
                this.snipeInfo.snipeFee = parseFloat(ctx.message.text);
            }
            const textMsg = `Token: ${this.snipeInfo.mintAddr} Information from BirdEye`;
            const keyboard = [
                [Markup.button.callback('🔃 Refresh', 'btn_refresh_specsnipe'), Markup.button.callback(`Slippage: ${this.snipeInfo.slippage}%✏`, 'btn_edit_slippage_specsnipe')],
                [Markup.button.callback(`Snipe fee: ${this.snipeInfo.snipeFee} SOL✏`, 'btn_edit_sinpefee_specsnipe'), Markup.button.callback(`Snipe tip: ${this.snipeInfo.snipeTip} SOL✏`, 'btn_edit_snipetip_specsnipe')],
                [Markup.button.callback(`🟢Take Profit (TP): ${this.snipeInfo.takeProfit}%`, 'btn_edit_takeprofit_specsnipe')],
                [Markup.button.callback(`🟢Stop Loss (SL): ${this.snipeInfo.stopLoss}%`, 'btn_edit_stoploss_specsnipe')],
                [Markup.button.callback(`Snipe 0.2 SOL`, 'btn_setamount_02_specsnipe'), Markup.button.callback(`Snipe 0.5 SOL`, 'btn_setamount_05_specsnipe')],
                [Markup.button.callback(`Snipe 1 SOL`, 'btn_setamount_1_specsnipe'), Markup.button.callback(`Snipe X SOL`, 'btn_setamount_x_specsnipe')],
                [Markup.button.callback(`❌ Close`, 'btn_close_specsnipe')],
            ];
            await ctx.reply(textMsg, Markup.inlineKeyboard(keyboard));
            ctx.scene.leave();
        }
    );

    public btn_edit_snipetip_specsnipe = new Scenes.WizardScene<MyContext>("btn_edit_snipetip_specsnipe",
        async ctx => {
            await ctx.reply("Please enter the Snipe Tip Amount value. (in SOL) - Example: 0.01");
            ctx.wizard.next();
        },
        async ctx => {
            if (ctx.message && 'text' in ctx.message) {
                this.snipeInfo.snipeTip = parseFloat(ctx.message.text);
            }
            const textMsg = `Token: ${this.snipeInfo.mintAddr} Information from BirdEye`;
            const keyboard = [
                [Markup.button.callback('🔃 Refresh', 'btn_refresh_specsnipe'), Markup.button.callback(`Slippage: ${this.snipeInfo.slippage}%✏`, 'btn_edit_slippage_specsnipe')],
                [Markup.button.callback(`Snipe fee: ${this.snipeInfo.snipeFee} SOL✏`, 'btn_edit_sinpefee_specsnipe'), Markup.button.callback(`Snipe tip: ${this.snipeInfo.snipeTip} SOL✏`, 'btn_edit_snipetip_specsnipe')],
                [Markup.button.callback(`🟢Take Profit (TP): ${this.snipeInfo.takeProfit}%`, 'btn_edit_takeprofit_specsnipe')],
                [Markup.button.callback(`🟢Stop Loss (SL): ${this.snipeInfo.stopLoss}%`, 'btn_edit_stoploss_specsnipe')],
                [Markup.button.callback(`Snipe 0.2 SOL`, 'btn_setamount_02_specsnipe'), Markup.button.callback(`Snipe 0.5 SOL`, 'btn_setamount_05_specsnipe')],
                [Markup.button.callback(`Snipe 1 SOL`, 'btn_setamount_1_specsnipe'), Markup.button.callback(`Snipe X SOL`, 'btn_setamount_x_specsnipe')],
                [Markup.button.callback(`❌ Close`, 'btn_close_specsnipe')],
            ];
            await ctx.reply(textMsg, Markup.inlineKeyboard(keyboard));
            ctx.scene.leave();
        }
    );

    public main = new Scenes.WizardScene<MyContext>("specsnipe",
        async ctx => {
            this.snipeInfo.userId = ctx.from?.id.toString()||"Invalid UserId";
            const textMsg = `Please enter the token address you want to snipe.`;
            const keyboard = [
                [Markup.button.callback('🔙 Back', 'btn_create_snipe'), Markup.button.callback('❌ Close', 'btn_close_specsnipe')]
            ];
            await ctx.reply(textMsg,Markup.inlineKeyboard(keyboard));
            ctx.wizard.next();
        },
        async ctx => {
            if (ctx.message && 'text' in ctx.message) {
                this.snipeInfo.mintAddr = ctx.message.text;
            }
            // Get token info using birdeye
            const textMsg = `Token: ${this.snipeInfo.mintAddr} Information from BirdEye`;
            const keyboard = [
                [Markup.button.callback('🔃 Refresh', 'btn_refresh_specsnipe'), Markup.button.callback(`Slippage: ${this.snipeInfo.slippage}%✏`, 'btn_edit_slippage_specsnipe')],
                [Markup.button.callback(`Snipe fee: ${this.snipeInfo.snipeFee} SOL✏`, 'btn_edit_sinpefee_specsnipe'), Markup.button.callback(`Snipe tip: ${this.snipeInfo.snipeTip} SOL✏`, 'btn_edit_snipetip_specsnipe')],
                [Markup.button.callback(`🟢Take Profit (TP): ${this.snipeInfo.takeProfit}%`, 'btn_edit_takeprofit_specsnipe')],
                [Markup.button.callback(`🟢Stop Loss (SL): ${this.snipeInfo.stopLoss}%`, 'btn_edit_stoploss_specsnipe')],
                [Markup.button.callback(`Snipe 0.2 SOL`, 'btn_setamount_02_specsnipe'), Markup.button.callback(`Snipe 0.5 SOL`, 'btn_setamount_05_specsnipe')],
                [Markup.button.callback(`Snipe 1 SOL`, 'btn_setamount_1_specsnipe'), Markup.button.callback(`Snipe X SOL`, 'btn_setamount_x_specsnipe')],
                [Markup.button.callback(`❌ Close`, 'btn_close_specsnipe')],
            ];
            await ctx.reply(textMsg, Markup.inlineKeyboard(keyboard));
            ctx.scene.leave();
        },
    );
}