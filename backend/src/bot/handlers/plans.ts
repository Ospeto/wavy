import { Context, SessionFlavor, InlineKeyboard } from "grammy";
import { SERVICE_PLANS } from "../constants.js";
import { translations } from "../translations.js";
import { SessionData, BotContext } from "../types.js";

export async function plansHandler(ctx: BotContext) {
    const lang = ctx.session.language || 'en';
    const t = translations[lang];

    let message = t.choose_plan;
    if (ctx.session.discountApplied) {
        message += `\n\n🎉 *${ctx.session.discountApplied}% Discount Applied!*`;
    }

    const keyboard = new InlineKeyboard();

    SERVICE_PLANS.forEach(plan => {
        const name = lang === 'mm' ? plan.nameMM : plan.nameEN;
        const emoji = plan.dataLimitEN.includes("Unlimited") ? "♾️" : "📊";

        let price = plan.price;
        let priceLabel = `${plan.price.toLocaleString()} MMK`;

        if (ctx.session.discountApplied) {
            price = Math.floor(plan.price * (1 - ctx.session.discountApplied / 100));
            priceLabel = `~${plan.price.toLocaleString()}~ ${price.toLocaleString()} MMK`;
        }

        keyboard.text(
            `${emoji} ${name} - ${priceLabel}`,
            `plan:${plan.id}`
        );
        keyboard.row();
    });

    await ctx.reply(message, {
        parse_mode: "Markdown",
        reply_markup: keyboard
    });
}

export async function planCallbackHandler(ctx: BotContext) {
    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData) return;

    const lang = ctx.session.language || 'en';
    const t = translations[lang];

    const planId = callbackData.replace("plan:", "");
    const plan = SERVICE_PLANS.find(p => p.id === planId);

    if (!plan) {
        await ctx.answerCallbackQuery({ text: t.plan_not_found });
        return;
    }

    // Calculate price with discount
    let finalPrice = plan.price;
    if (ctx.session.discountApplied) {
        finalPrice = Math.floor(plan.price * (1 - ctx.session.discountApplied / 100));
    }

    // Save to session
    ctx.session.selectedPlanId = plan.id;
    ctx.session.expectedAmount = finalPrice;
    ctx.session.awaitingPaymentProof = false;

    await ctx.answerCallbackQuery();

    const description = lang === 'mm' ? plan.descriptionMM : plan.descriptionEN;
    const name = lang === 'mm' ? plan.nameMM : plan.nameEN;
    const duration = lang === 'mm' ? plan.durationMM : plan.durationEN;
    const dataLimit = lang === 'mm' ? plan.dataLimitMM : plan.dataLimitEN;

    const priceDisplay = ctx.session.discountApplied
        ? `~${plan.price.toLocaleString()}~ *${finalPrice.toLocaleString()} MMK* (-${ctx.session.discountApplied}%)`
        : `${plan.price.toLocaleString()} MMK`;

    const planDetails = `
✅ *${lang === 'mm' ? 'သင်ရွေးချယ်ထားသော ပလန်:' : 'You selected:'}* ${name}

📝 *${t.description_label}:*
${description}

📊 *${t.plan_details_title}:*
├ ${t.duration_label}: ${duration}
├ ${t.data_label}: ${dataLimit}
└ ${t.amount_paid_label}: ${priceDisplay}

${t.choose_payment}
`;

    let keyboard = new InlineKeyboard();

    if (ctx.session.discountApplied === 100) {
        keyboard.text(t.claim_free_button, `claim_free:${plan.id}`);
    } else {
        keyboard
            .text("💙 KBZ Pay", `pay:kbz:${plan.id}`)
            .row()
            .text("💛 Wave Money", `pay:wave:${plan.id}`)
            .row()
            .text("💚 Aya Pay", `pay:aya:${plan.id}`)
            .row();

        // Only show promo button if not already applied
        if (!ctx.session.discountApplied) {
            keyboard.text(t.promo_button, `enter_promo:${plan.id}`);
        }
    }

    await ctx.reply(planDetails, {
        parse_mode: "Markdown",
        reply_markup: keyboard
    });
}
