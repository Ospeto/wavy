import { Context, SessionFlavor, InlineKeyboard } from "grammy";
import { verifyPaymentSlipOnServer } from "../../gemini.js";
import { createAccessKeyOnRemnawave, ServicePlan } from "../../remnawave.js";
import { SERVICE_PLANS } from "../constants.js";
import { translations } from "../translations.js";
import {
    createTransaction,
    updateTransactionVerified,
    updateTransactionFailed,
    isTransactionUsed,
    incrementPromoCodeUsage
} from "../../database.js";
import { SessionData, BotContext } from "../types.js";

export async function photoHandler(ctx: BotContext) {
    const lang = ctx.session.language || 'en';
    const t = translations[lang];

    // --- Improved Anti-Spam Logic ---
    const SHORT_COOLDOWN_MS = 5 * 1000; // 5 seconds between burst attempts
    const BURST_COOLDOWN_MS = 20 * 1000; // 20 seconds after 3 attempts
    const MAX_BURST = 3;

    const now = Date.now();
    const lastUpload = ctx.session.lastUploadTime || 0;
    const currentCount = ctx.session.uploadCount || 0;

    // Reset burst if it's been more than 60s
    if (now - lastUpload > 60000) {
        ctx.session.uploadCount = 0;
    }

    if (currentCount >= MAX_BURST) {
        const remaining = Math.ceil((BURST_COOLDOWN_MS - (now - lastUpload)) / 1000);
        if (remaining > 0) {
            await ctx.reply(
                t.wait_seconds.replace('{seconds}', remaining.toString()),
                { parse_mode: "Markdown" }
            );
            return;
        } else {
            // Burst cooldown passed, reset
            ctx.session.uploadCount = 0;
        }
    } else {
        // Within burst, still check for short delay
        const remainingShort = Math.ceil((SHORT_COOLDOWN_MS - (now - lastUpload)) / 1000);
        if (remainingShort > 0 && currentCount > 0) {
            await ctx.reply(
                `⏳ Please wait *${remainingShort}s* before sending again.`,
                { parse_mode: "Markdown" }
            );
            return;
        }
    }
    // --- End of Rate Limiting ---

    // Check if we're expecting a payment proof
    if (!ctx.session.awaitingPaymentProof || !ctx.session.selectedPlanId || !ctx.session.expectedAmount) {
        await ctx.reply(`${t.not_expecting_photo}\n\n${t.use_start_first}`);
        return;
    }

    const plan = SERVICE_PLANS.find(p => p.id === ctx.session.selectedPlanId);
    if (!plan) {
        await ctx.reply(t.plan_not_found);
        ctx.session.awaitingPaymentProof = false;
        return;
    }

    // Get the largest photo
    const photos = ctx.message?.photo;
    if (!photos || photos.length === 0) {
        await ctx.reply("❌ Error processing photo.");
        return;
    }

    const largestPhoto = photos[photos.length - 1];
    const userId = ctx.from?.id?.toString() || "unknown";
    const username = ctx.from?.username;

    // Create pending transaction in database
    const txRecordId = createTransaction({
        telegram_user_id: userId,
        telegram_username: username,
        plan_id: plan.id,
        plan_name: lang === 'mm' ? plan.nameMM : plan.nameEN,
        amount: ctx.session.expectedAmount,
        payment_method: ctx.session.paymentMethod,
        status: 'pending'
    });

    // Send processing message
    const processingMsg = await ctx.reply(`${t.verifying_payment}\n\n${t.please_wait}`, {
        parse_mode: "Markdown"
    });

    try {
        // Download the photo
        const file = await ctx.api.getFile(largestPhoto.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`;

        // Fetch and convert to base64
        // Fetch and convert to base64 with retry logic
        let response;
        let retries = 3;
        while (retries > 0) {
            try {
                response = await fetch(fileUrl);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                break;
            } catch (err) {
                retries--;
                if (retries === 0) throw err;
                console.warn(`Fetch failed, retrying... (${retries} attempts left)`);
                await new Promise(res => setTimeout(res, 1000));
            }
        }

        if (!response) throw new Error("Failed to fetch image after retries");

        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");

        // Verify with Gemini
        const verificationResult = await verifyPaymentSlipOnServer(
            base64,
            ctx.session.expectedAmount,
            "image/jpeg",
            ctx.session.paymentMethod,
            new Date().toLocaleString('en-GB', { timeZone: 'Asia/Yangon' }),
            plan.price,
            ctx.session.discountApplied
        );

        // Update rate limit state
        ctx.session.lastUploadTime = Date.now();
        ctx.session.uploadCount = (ctx.session.uploadCount || 0) + 1;

        if (verificationResult.isValid) {
            // Check if transaction ID was already used
            if (verificationResult.transactionId && isTransactionUsed(verificationResult.transactionId)) {
                await ctx.api.editMessageText(
                    ctx.chat!.id,
                    processingMsg.message_id,
                    `${t.duplicate_transaction}\n\n${t.duplicate_msg}`,
                    { parse_mode: "Markdown" }
                );
                updateTransactionFailed(txRecordId, "Duplicate transaction ID");
                return;
            }

            // Payment verified! Generate key
            await ctx.api.editMessageText(
                ctx.chat!.id,
                processingMsg.message_id,
                `${t.payment_verified}\n\n${t.generating_key}`,
                { parse_mode: "Markdown" }
            );

            // Create the access key
            const servicePlan: ServicePlan = {
                id: plan.id,
                name: lang === 'mm' ? plan.nameMM : plan.nameEN,
                type: plan.type,
                dataLimit: lang === 'mm' ? plan.dataLimitMM : plan.dataLimitEN
            };

            const telegramId = ctx.from?.id;
            const telegramUsername = ctx.from?.username;
            const accessKey = await createAccessKeyOnRemnawave(servicePlan, verificationResult.transactionId, telegramId, telegramUsername);

            // Update transaction in database
            updateTransactionVerified(
                txRecordId,
                verificationResult.transactionId || `auto_${Date.now()}`,
                accessKey.key
            );

            // Handle promo code usage
            if (ctx.session.promoCode) {
                incrementPromoCodeUsage(ctx.session.promoCode);
            }

            const localizedName = lang === 'mm' ? plan.nameMM : plan.nameEN;

            // Send success message with key
            const successMessage = `
${t.success_title}

${t.subscription_ready}

📦 *${t.plan_label}:* ${localizedName}
📅 *${t.expires_label}:* ${accessKey.expiryDate}
💰 *${t.amount_paid_label}:* ${verificationResult.detectedAmount?.toLocaleString() || ctx.session.expectedAmount.toLocaleString()} MMK
🆔 *${t.transaction_label}:* \`${verificationResult.transactionId || 'N/A'}\`

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

            const keyboard = new InlineKeyboard()
                .url(t.open_link_label, accessKey.key);

            await ctx.reply(successMessage, {
                parse_mode: "Markdown",
                reply_markup: keyboard
            });

            // Reset session
            ctx.session.awaitingPaymentProof = false;
            ctx.session.selectedPlanId = undefined;
            ctx.session.expectedAmount = undefined;
            ctx.session.paymentMethod = undefined;
            ctx.session.promoCode = undefined;
            ctx.session.discountApplied = undefined;
            ctx.session.awaitingPromoCode = false;

        } else {
            // Verification failed
            updateTransactionFailed(txRecordId, verificationResult.reason || "Verification failed");

            // Check if it's a rate limit error
            const isRateLimit = verificationResult.reason?.includes("429") || verificationResult.reason?.includes("RESOURCE_EXHAUSTED");
            const isLocationError = verificationResult.reason?.includes("User location is not supported");

            const keyboard = new InlineKeyboard().url(t.contact_support, "https://t.me/ospeto");

            let reasonMsg = verificationResult.reason;
            // Sanitize reason to avoid Markdown errors if it contains JSON or weird chars
            if (reasonMsg.includes('{') || reasonMsg.includes('}')) {
                try {
                    // Try to extract just the message if it's a JSON string
                    const parsed = JSON.parse(reasonMsg);
                    reasonMsg = parsed.error?.message || reasonMsg;
                } catch {
                    // unexpected format, just strip chars
                    reasonMsg = reasonMsg.replace(/[{}"\[\]]/g, '');
                }
            }

            // Escape special markdown chars for legacy V1
            reasonMsg = reasonMsg.replace(/[_*`\[]/g, '\\$&');

            let failMessage = "";

            if (isRateLimit) {
                failMessage = t.rate_limit_msg;
            } else if (isLocationError) {
                failMessage = "❌ *Service Unavailable*\n\nOur AI verification system is currently not available in this server region. Please contact support manually.";
            } else {
                failMessage = `${t.verification_failed}\n\n${reasonMsg}\n\n${t.tips_title}\n• ${t.tip_success}\n• ${t.tip_receipt}\n• ${t.tip_mismatch}\n\n${t.need_help}`;
            }

            await ctx.reply(failMessage, {
                parse_mode: "Markdown",
                reply_markup: keyboard
            });
        }

    } catch (error: any) {
        console.error("Verification error:", error);
        updateTransactionFailed(txRecordId, error.message || "Unknown error");
        const keyboard = new InlineKeyboard().url(t.contact_support, "https://t.me/ospeto");
        await ctx.reply(t.unexpected_error, {
            parse_mode: "Markdown",
            reply_markup: keyboard
        });
    }
}
