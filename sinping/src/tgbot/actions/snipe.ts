import { Context, Markup } from "telegraf";

module.exports = class Spec_snipe {
    public btn_create_snipe = async (ctx:Context) => {
        const textMsg = `🎯 Snipe Specific Token
🔷 Enter the token’s contract address into the bot.
🔷 The bot will monitor the launch and instantly execute your buy order when liquidity is added.
🔷 After purchase, the bot actively manages 📈Take Profit (TP) and 📉Stop Loss (SL) levels to lock in gains or minimize losses.\n
🤖 Auto Snipe
🔶 Let the bot do the work for you!
🔶 It scans for new token launches in real-time and automatically purchases tokens that meet your custom criteria.\n
🚀 Ready to snipe your next big opportunity?
Choose your snipe mode and configure your settings to get started!`
        const keyboard = [
            [Markup.button.callback('Specific Token', 'btn_create_specsnipe'), Markup.button.callback('Auto Snipe', 'btn_back_autosnipe')],
            [Markup.button.callback('🔙 Back', 'btn_snipe'), Markup.button.callback('❌ Close', 'btn_close_specsnipe')]
        ];
        ctx.state.username = ctx.from?.username;
        console.log(ctx.state.username);
        ctx.reply(textMsg, Markup.inlineKeyboard(keyboard));
    }
}