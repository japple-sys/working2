import { Scenes, session, Telegraf } from "telegraf";
import { MyContext } from "./utils";
import dotenv from "dotenv";
dotenv.config();
require('mongoose').connect("mongodb://localhost:27017/nwscoindev");

const SnipeClass = require('./actions/snipe');
const Snipe = new SnipeClass();
const MenuClass = require('./actions/main_menu');
const Main_menu = new MenuClass();
const CommandsClass = require('./commands');
const Commands = new CommandsClass()
const SpecsnipeScene = require('./scenes/specsnipe');
const SpecsnipeInstance = new SpecsnipeScene();

if (process.env.BOT_TOKEN === undefined) {
	throw new TypeError("BOT_TOKEN must be provided!");
}
const stage = new Scenes.Stage<MyContext>([
    SpecsnipeInstance.main, 
    SpecsnipeInstance.btn_edit_sinpefee_specsnipe, 
    SpecsnipeInstance.btn_edit_slippage_specsnipe,
    SpecsnipeInstance.btn_edit_snipetip_specsnipe,
]);
const bot = new Telegraf<MyContext>(process.env.BOT_TOKEN);

// bot.use(session());
// bot.use(stage.middleware());

bot.start(Commands.cmd_start);

// bot.action('btn_snipe', Main_menu.btn_snipe);
// bot.action('btn_create_snipe', Snipe.btn_create_snipe);
// bot.action('btn_create_specsnipe', async (ctx) => await ctx.scene.enter("specsnipe"));
// bot.action('btn_edit_slippage_specsnipe', async (ctx) => await ctx.scene.enter("btn_edit_slippage_specsnipe"));
// bot.action('btn_edit_sinpefee_specsnipe', async (ctx) => await ctx.scene.enter("btn_edit_sinpefee_specsnipe"));
// bot.action('btn_edit_snipetip_specsnipe', async (ctx) => await ctx.scene.enter("btn_edit_snipetip_specsnipe"));

bot.launch();