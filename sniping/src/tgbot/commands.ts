import { Context, Markup } from "telegraf";

module.exports = class Commands {
    public cmd_start = async (ctx:Context) => {
        // ctx.session.step = 'start';
        ctx.reply(
            'Welcome! This is test mode...',
            Markup.inlineKeyboard([
                [Markup.button.callback('🎯 Snipe', 'btn_snipe')], // Inline button with callback data
            ])
        );
    }
}