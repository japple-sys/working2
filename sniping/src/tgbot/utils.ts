import { Context, Scenes } from "telegraf";

export interface MyContext extends Context {
    scene: Scenes.SceneContextScene<MyContext, Scenes.WizardSessionData>;
    wizard: Scenes.WizardContextWizard<MyContext>;
}