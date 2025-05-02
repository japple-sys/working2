import { Telegraf, session, Scenes, Context, Markup } from 'telegraf'
import { message } from "telegraf/filters";
import dotenv from "dotenv";
dotenv.config();

require('mongoose').connect("mongodb://localhost:27017/sniping");
const SpecsnipeClass = require('./actions/spec_snipe');
const Spec_snipe = new SpecsnipeClass();
const MenuClass = require('./actions/main_menu');
const Main_menu = new MenuClass();
const CommandsClass = require('./commands');
const Commands = new CommandsClass()

if (process.env.BOT_TOKEN === undefined) {
	throw new TypeError("BOT_TOKEN must be provided!");
}

interface SessionData {
	isTokenAddress: string;
    tokenAddr: string;
}
interface MyContext extends Context {
	session: SessionData;
}

const bot = new Telegraf<MyContext>(process.env.BOT_TOKEN);

bot.start(Commands.cmd_start);

bot.use(session());

bot.on("message", async (ctx:MyContext) => {
	// set a default value
    if(ctx.session.isTokenAddress){
        ctx.session.tokenAddr = ctx.message?.text;
    }
	await ctx.reply(`Seen ${ctx.session.isTokenAddress} messages.`);
});

bot.action('btn_snipe', Main_menu.btn_snipe);
bot.action('btn_create_snipe', Spec_snipe.btn_create_snipe);
bot.action('btn_create_specsnipe', Spec_snipe.btn_create_specsnipe);

  // Launch the bot
bot.launch()
    .then(() => console.log('Bot is up and running!'))
    .catch((err:Error) => console.error('Failed to launch the bot:', err));

// Graceful shutdown on termination signals
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));