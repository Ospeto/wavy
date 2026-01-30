import { Context, SessionFlavor, InlineKeyboard } from "grammy";
import { SERVICE_PLANS } from "../constants.js";
import { translations } from "../translations.js";
import { upsertUser } from "../../database.js";
import { SessionData, BotContext } from "../types.js";

export async function startHandler(ctx: BotContext) {
    const userId = ctx.from?.id.toString();
    const username = ctx.from?.username;

    // Register/update user in database
    if (userId) {
        upsertUser(userId, username);
    }

    // If language is not set, ask for it first
    if (!ctx.session.language) {
        const keyboard = new InlineKeyboard()
            .text("မြန်မာ 🇲🇲", "set_lang:mm")
            .text("English 🇺🇸", "set_lang:en");

        await ctx.reply("Please choose your language / ဘာသာစကား ရွေးချယ်ပေးပါ-", {
            reply_markup: keyboard
        });
        return;
    }

    const t = translations[ctx.session.language];
    const welcomeMessage = t.welcome_message;

    const keyboard = new InlineKeyboard();

    // Group plans by duration
    const oneMonth = SERVICE_PLANS.filter(p => p.type === "ONE_MONTH");
    const threeMonth = SERVICE_PLANS.filter(p => p.type === "THREE_MONTHS");
    const sixMonth = SERVICE_PLANS.filter(p => p.type === "SIX_MONTHS");

    // Helper to format price
    const formatPrice = (price: number) => {
        if (ctx.session.discountApplied) {
            const discounted = Math.floor(price * (1 - ctx.session.discountApplied / 100));
            return `~${price.toLocaleString()}~ ${discounted.toLocaleString()} MMK`;
        }
        return `${price.toLocaleString()} MMK`;
    };

    // Add 1 month plans
    oneMonth.forEach(plan => {
        const name = ctx.session.language === 'mm' ? plan.nameMM : plan.nameEN;
        keyboard.text(`📦 ${name} - ${formatPrice(plan.price)}`, `plan:${plan.id}`);
        keyboard.row();
    });

    // Add 3 month plans
    threeMonth.forEach(plan => {
        const name = ctx.session.language === 'mm' ? plan.nameMM : plan.nameEN;
        keyboard.text(`📦 ${name} - ${formatPrice(plan.price)}`, `plan:${plan.id}`);
        keyboard.row();
    });

    // Add 6 month plans
    sixMonth.forEach(plan => {
        const name = ctx.session.language === 'mm' ? plan.nameMM : plan.nameEN;
        keyboard.text(`📦 ${name} - ${formatPrice(plan.price)}`, `plan:${plan.id}`);
        keyboard.row();
    });

    // Add Support Button
    keyboard.url(t.contact_support, "https://t.me/ospeto");

    await ctx.reply(welcomeMessage, {
        parse_mode: "Markdown",
        reply_markup: keyboard
    });
}
