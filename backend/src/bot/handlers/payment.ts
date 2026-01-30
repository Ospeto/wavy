import { Context, SessionFlavor } from "grammy";
import { PAYMENT_METHODS, SERVICE_PLANS } from "../constants.js";
import { translations } from "../translations.js";
import { SessionData, BotContext } from "../types.js";

export async function paymentCallbackHandler(ctx: BotContext) {
    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData) return;

    const lang = ctx.session.language || 'en';
    const t = translations[lang];

    // Format: pay:kbz:planId or pay:wave:planId or pay:aya:planId
    const parts = callbackData.split(":");
    const paymentType = parts[1]; // kbz, wave, or aya
    const planId = parts[2];

    const plan = SERVICE_PLANS.find(p => p.id === planId);
    if (!plan) {
        await ctx.answerCallbackQuery({ text: t.plan_not_found });
        return;
    }

    // Find payment method
    const paymentMethod = PAYMENT_METHODS.find(p => p.id === paymentType);

    if (!paymentMethod) {
        await ctx.answerCallbackQuery({ text: "Payment method not found!" });
        return;
    }

    // Update session
    ctx.session.selectedPlanId = plan.id;

    let finalPrice = plan.price;
    if (ctx.session.discountApplied) {
        finalPrice = Math.floor(plan.price * (1 - ctx.session.discountApplied / 100));
    }

    ctx.session.expectedAmount = finalPrice;
    ctx.session.awaitingPaymentProof = true;
    ctx.session.paymentMethod = paymentMethod.provider;

    await ctx.answerCallbackQuery();

    const paymentInstructions = `
${paymentMethod.emoji} *${paymentMethod.provider} ${t.payment_instructions_title}*

${t.transfer_details}
├ ${t.account_name}: \`${paymentMethod.accountName}\`
├ ${t.phone_number}: \`${paymentMethod.accountNumber}\`
└ ${t.amount}: *${ctx.session.expectedAmount.toLocaleString()} MMK* ${ctx.session.discountApplied ? `(Discount ${ctx.session.discountApplied}% applied)` : ""}

🔢 *Steps:*
${t.step_1.replace('{provider}', paymentMethod.provider)}
${t.step_2.replace('{amount}', ctx.session.expectedAmount.toLocaleString())}
${t.step_3}
${t.step_4}

${t.waiting_screenshot}

${t.vpn_warning}

${t.auto_generation_note}
`;

    await ctx.reply(paymentInstructions, {
        parse_mode: "Markdown"
    });
}
