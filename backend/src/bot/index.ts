import { Bot, Context, session, SessionFlavor } from "grammy";
import { config, assertConfig } from "../config.js";
import { startHandler } from "./handlers/start.js";
import { plansHandler, planCallbackHandler } from "./handlers/plans.js";
import { paymentCallbackHandler } from "./handlers/payment.js";
import { photoHandler } from "./handlers/verify.js";
import { helpHandler } from "./handlers/help.js";
import { adminHandler, adminTxHandler, addPromoHandler, adminPlansHandler, adminRevenueHandler } from "./handlers/admin.js";
import { translations } from "./translations.js";
import {
    getPromoCode,
    createTransaction,
    updateTransactionVerified,
    incrementPromoCodeUsage
} from "../database.js";
import { createAccessKeyOnRemnawave, ServicePlan } from "../remnawave.js";
import { SERVICE_PLANS } from "./constants.js";

// Import database to initialize it
import "../database.js";

// Session data interface
interface SessionData {
    selectedPlanId?: string;
    expectedAmount?: number;
    awaitingPaymentProof?: boolean;
    paymentMethod?: string;
    lastUploadTime?: number;
    uploadCount?: number;
    promoCode?: string;
    discountApplied?: number;
    awaitingPromoCode?: boolean;
    language?: 'en' | 'mm';
}

// Context with session
type BotContext = Context & SessionFlavor<SessionData>;

// Validate config
assertConfig();

if (!config.telegramBotToken) {
    console.error("❌ TELEGRAM_BOT_TOKEN is not set!");
    process.exit(1);
}

// Create bot instance
const bot = new Bot<BotContext>(config.telegramBotToken);

// Session middleware
bot.use(session({
    initial: (): SessionData => ({
        selectedPlanId: undefined,
        expectedAmount: undefined,
        awaitingPaymentProof: false,
        paymentMethod: undefined,
        lastUploadTime: 0,
        language: undefined // Will be set on first use or /start
    })
}));

// Language Middleware: Ensure language is set or asked
bot.use(async (ctx, next) => {
    if (ctx.from && !ctx.session.language && !ctx.message?.text?.startsWith('/start')) {
        // Only prompt if not already trying to start or choosing language
        // For now, we'll let the start handler handle the initial choice
    }
    await next();
});


// Commands
bot.command("start", startHandler);
bot.command("plans", plansHandler);
bot.command("help", helpHandler);
bot.command("admin", adminHandler);
bot.command("admin_tx", adminTxHandler);
bot.command("addpromo", addPromoHandler);
bot.command("admin_plans", adminPlansHandler);
bot.command("admin_revenue", adminRevenueHandler);
bot.command("language", async (ctx) => {
    const { InlineKeyboard } = await import("grammy");
    const keyboard = new InlineKeyboard()
        .text("မြန်မာ 🇲🇲", "set_lang:mm")
        .text("English 🇺🇸", "set_lang:en");
    await ctx.reply("Please choose your language / ဘာသာစကား ရွေးချယ်ပေးပါ-", {
        reply_markup: keyboard
    });
});

// Language selection callback
bot.callbackQuery(/^set_lang:/, async (ctx) => {
    const lang = ctx.callbackQuery.data.split(":")[1] as 'en' | 'mm';
    ctx.session.language = lang;
    await ctx.answerCallbackQuery();
    const welcome = lang === 'mm' ? "ဘာသာစကားကို မြန်မာသို့ ပြောင်းလဲလိုက်ပါပြီ။" : "Language set to English.";
    await ctx.reply(welcome);
    return startHandler(ctx); // Restart with new language
});


// Callback queries (button clicks)
bot.callbackQuery(/^plan:/, planCallbackHandler);
bot.callbackQuery(/^pay:/, paymentCallbackHandler);

bot.callbackQuery(/^claim_free:/, async (ctx) => {
    const lang = ctx.session.language || 'en';
    const t = translations[lang];

    if (ctx.session.discountApplied !== 100 || !ctx.session.selectedPlanId) {
        await ctx.answerCallbackQuery({ text: "Invalid request." });
        return;
    }

    const plan = SERVICE_PLANS.find(p => p.id === ctx.session.selectedPlanId);
    if (!plan) {
        await ctx.answerCallbackQuery({ text: t.plan_not_found });
        return;
    }

    await ctx.answerCallbackQuery();

    // Security: Ensure chat exists
    if (!ctx.chat) {
        await ctx.reply("Error: Unable to determine chat context.");
        return;
    }

    // Show claiming message
    const claimingMsg = await ctx.reply(t.claiming_free, { parse_mode: "Markdown" });

    try {
        const userId = ctx.from?.id?.toString() || "unknown";
        const username = ctx.from?.username;

        // 1. Create transaction record
        const txRecordId = createTransaction({
            telegram_user_id: userId,
            telegram_username: username,
            plan_id: plan.id,
            plan_name: lang === 'mm' ? plan.nameMM : plan.nameEN,
            amount: 0,
            payment_method: "PROMO_FREE",
            status: 'pending'
        });

        // 2. Generate Access Key
        const servicePlan: ServicePlan = {
            id: plan.id,
            name: lang === 'mm' ? plan.nameMM : plan.nameEN,
            type: plan.type,
            dataLimit: lang === 'mm' ? plan.dataLimitMM : plan.dataLimitEN
        };

        const txId = `FREE_${Date.now()}`;
        const accessKey = await createAccessKeyOnRemnawave(servicePlan, txId, ctx.from?.id, ctx.from?.username);

        // 3. Update transaction
        updateTransactionVerified(txRecordId, txId, accessKey.key);

        // 4. Increment promo usage
        if (ctx.session.promoCode) {
            incrementPromoCodeUsage(ctx.session.promoCode);
        }

        // 5. Success Message
        const localizedName = lang === 'mm' ? plan.nameMM : plan.nameEN;
        const successMessage = `
${t.success_title}

${t.subscription_ready}

📦 *${t.plan_label}:* ${localizedName}
📅 *${t.expires_label}:* ${accessKey.expiryDate}
💰 *${t.amount_paid_label}:* 0 MMK (Free Claim)
🆔 *${t.transaction_label}:* \`${txId}\`

🔑 *${t.your_key_label}:*
${accessKey.key}

*(Tap the link above to open, or tap below to copy)*
\`${accessKey.key}\`

${t.how_to_use_title}
${t.how_to_step_1}
${t.how_to_step_2}
${t.how_to_step_3}
${t.how_to_step_4}
${t.how_to_step_5}

${t.server_switch_warning}

${t.thank_you}
`;

        const { InlineKeyboard } = await import("grammy");
        const keyboard = new InlineKeyboard().url(t.open_link_label, accessKey.key);

        await ctx.api.editMessageText(
            ctx.chat!.id,
            claimingMsg.message_id,
            successMessage,
            {
                parse_mode: "Markdown",
                reply_markup: keyboard
            }
        );

        // Reset session
        ctx.session.awaitingPaymentProof = false;
        ctx.session.selectedPlanId = undefined;
        ctx.session.expectedAmount = undefined;
        ctx.session.paymentMethod = undefined;
        ctx.session.promoCode = undefined;
        ctx.session.discountApplied = undefined;
        ctx.session.awaitingPromoCode = false;

    } catch (error: any) {
        console.error("Free claim error:", error);
        await ctx.reply(t.unexpected_error);
    }
});

bot.callbackQuery(/^enter_promo:/, async (ctx) => {
    const lang = ctx.session.language || 'en';
    const t = translations[lang];
    ctx.session.awaitingPromoCode = true;
    await ctx.answerCallbackQuery();
    await ctx.reply(t.enter_promo_title + ":\n\n" + t.promo_prompt);
});

// Text messages (Promo code entry)
bot.on("message:text", async (ctx, next) => {
    if (ctx.session.awaitingPromoCode) {
        const lang = ctx.session.language || 'en';
        const t = translations[lang];
        const code = ctx.message.text.trim().toUpperCase();
        const promo = getPromoCode(code);

        if (promo && promo.usage_count < promo.usage_limit && new Date(promo.expires_at) > new Date()) {
            // Check plan restriction
            if (promo.applicable_plan_ids && promo.applicable_plan_ids.length > 0) {
                if (!ctx.session.selectedPlanId || !promo.applicable_plan_ids.includes(ctx.session.selectedPlanId)) {
                    ctx.session.awaitingPromoCode = false;
                    await ctx.reply(t.promo_invalid_plan);
                    return plansHandler(ctx);
                }
            }

            ctx.session.promoCode = code;
            ctx.session.discountApplied = promo.discount_percentage;
            ctx.session.awaitingPromoCode = false;
            await ctx.reply(t.promo_applied.replace('{discount}', promo.discount_percentage.toString()));
            // Show plans again or just let them continue? 
            // Better to show the plan selection again so they can pick with discount
            return plansHandler(ctx);
        } else {
            ctx.session.awaitingPromoCode = false;
            await ctx.reply(promo ? t.promo_expired : t.promo_invalid);
            return plansHandler(ctx);
        }
    }
    await next();
});

// Photo messages (payment screenshots)
bot.on("message:photo", photoHandler);

// Error handler with improved logging
bot.catch((err) => {
    const ctx = err.ctx;
    console.error("Bot error:", {
        error: err.error,
        message: err.message,
        userId: ctx?.from?.id,
        username: ctx?.from?.username,
        update: ctx?.update?.update_id
    });
});

// Start bot
console.log("🤖 Starting Wavy Telegram Bot...");
bot.start({
    onStart: (botInfo) => {
        console.log(`✅ Bot @${botInfo.username} is running!`);
    }
});

export { bot, BotContext, SessionData };
