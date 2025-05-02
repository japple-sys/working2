import { Context, Markup } from "telegraf";
const Specsnipes = require('../../models/specsnipes');

module.exports = class Main_menu {
    public btn_snipe = async (ctx:Context) => {
        const userId = ctx.from?.id; //console.log("userId: ",userId);
        const snipesByUserId = await Specsnipes.find({userId});
        // console.log(snipesByUserId);
        let textMsg = "";
        let keyboard = [];
        if (!snipesByUserId.length){ 
            textMsg = "View and manage your snipes\n\n💡 You don’t have any active snipes!";
            keyboard = [
                [Markup.button.callback('🆕 Create NewSnipes', 'btn_create_snipe')],
                [Markup.button.callback('🔙 Back', 'btn_back_specsnipe'), Markup.button.callback('❌ Close', 'btn_close_specsnipe')],
            ];
        }
        else { 
            textMsg = "View and manage your snipes";
            snipesByUserId.map((snipe: any) => {
                const shortedMintAddr = snipe.mintAddr.slice(0, 7);
                keyboard.push([Markup.button.callback(`${shortedMintAddr}... (${snipe.status})`, `btn_specsnipe_${userId}_${shortedMintAddr}`)]);
            });
            keyboard.push([Markup.button.callback('🆕 Create NewSnipes', 'btn_create_snipe')]);
            keyboard.push([Markup.button.callback('🔙 Back', 'btn_back_specsnipe'), Markup.button.callback('❌ Close', 'btn_close_specsnipe')]);
        }
        ctx.reply( textMsg, Markup.inlineKeyboard(keyboard) );
    }
}