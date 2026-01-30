import { Context, SessionFlavor } from "grammy";
import { config } from "../../config.js";
import { getRecentTransactions, getTransactionStats, addPromoCode } from "../../database.js";
import { SERVICE_PLANS } from "../constants.js";
import { SessionData, BotContext } from "../types.js";

function isAdmin(ctx: BotContext): boolean {
    const userId = ctx.from?.id?.toString();
    if (!userId) return false;
    return config.adminUserIds.includes(userId);
}

export async function adminHandler(ctx: BotContext) {
    if (!isAdmin(ctx)) {
        console.log(`🚫 Unauthorized admin access attempt by ${ctx.from?.id}`);
        return;
    }

    const stats = getTransactionStats();

    // Using backticks for commands and escaping underscores
    const message = `
📊 *Wavy System Stats*

💰 *Transactions:*
• Total: \`${stats.total}\`
• Completed: ✅ \`${stats.completed}\`
• Failed: ❌ \`${stats.failed}\`
• Pending: ⏳ \`${stats.pending}\`

🛠 *Admin Commands:*
\`/admin\` - This summary
\`/admin_tx\` - Recent 10 transactions
\`/addpromo <code> <%discount> <limit> <days> [plan_id]\`
\`/admin_plans\` - List all plan IDs
`;

    try {
        await ctx.reply(message, { parse_mode: "Markdown" });
    } catch (error) {
        console.error("Markdown V1 failed, falling back to plain text:", error);
        await ctx.reply(message.replace(/\*/g, "").replace(/`/g, ""));
    }
}

export async function adminTxHandler(ctx: BotContext) {
    if (!isAdmin(ctx)) return;

    const recent = getRecentTransactions(10);

    if (recent.length === 0) {
        await ctx.reply("📭 No transactions found in database.");
        return;
    }

    let message = "📜 *Recent Transactions (Top 10)*\n\n";

    for (const tx of recent) {
        const time = new Date(tx.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Yangon' });
        const marker = tx.status === 'completed' ? '✅' : tx.status === 'failed' ? '❌' : '⏳';

        // Escape underscores for Markdown V1
        const safeUsername = (tx.telegram_username || tx.telegram_user_id).replace(/_/g, "\\_");

        message += `${marker} *ID:* \`${tx.id}\` | *User:* @${safeUsername}\n`;
        message += `💵 *Plan:* \`${tx.plan_name}\` (\`${tx.amount.toLocaleString()}\` MMK)\n`;
        message += `🆔 *TxID:* \`${tx.transaction_id || 'N/A'}\`\n`;

        if (tx.subscription_key) {
            message += `🔑 *Key:* \`${tx.subscription_key}\`\n`;
        }

        if (tx.error_message) {
            // Remove markdown characters from error message to be safe
            const safeError = tx.error_message.replace(/[*_`]/g, "");
            message += `⚠️ *Error:* ${safeError}\n`;
        }

        message += `📅 *Date:* ${time}\n`;
        message += `──────────────────\n`;
    }

    const sendChunk = async (text: string) => {
        try {
            await ctx.reply(text, { parse_mode: "Markdown" });
        } catch (error) {
            console.error("Markdown V1 failed for admin_tx chunk, using plain text:", error);
            await ctx.reply(text.replace(/\*/g, "").replace(/`/g, "").replace(/\\_/g, "_"));
        }
    };

    // Split message if too long for Telegram
    if (message.length > 4000) {
        const chunks = message.match(/[\s\S]{1,4000}/g) || [];
        for (const chunk of chunks) {
            await sendChunk(chunk);
        }
    } else {
        await sendChunk(message);
    }
}

export async function addPromoHandler(ctx: BotContext) {
    if (!isAdmin(ctx)) return;

    const args = ctx.message?.text?.split(/\s+/);
    if (!args || args.length < 5) {
        await ctx.reply("❌ Usage: `/addpromo <code> <discount%> <limit> <days_valid> [plan_id]`\nExample: `/addpromo SAVE10 10 50 7 1m-unlimited`", { parse_mode: "Markdown" });
        return;
    }

    const code = args[1].toUpperCase();
    const discount = parseInt(args[2]);
    const limit = parseInt(args[3]);
    const days = parseInt(args[4]);
    const planId = args[5]; // Optional

    if (isNaN(discount) || isNaN(limit) || isNaN(days)) {
        await ctx.reply("❌ Discount, limit, and days must be valid numbers.");
        return;
    }

    // Security: Validate ranges
    if (discount < 1 || discount > 100) {
        await ctx.reply("❌ Discount must be between 1 and 100.");
        return;
    }

    if (limit < 1) {
        await ctx.reply("❌ Usage limit must be at least 1.");
        return;
    }

    if (days < 1) {
        await ctx.reply("❌ Days valid must be at least 1.");
        return;
    }

    if (planId && !SERVICE_PLANS.find(p => p.id === planId)) {
        await ctx.reply(`❌ Invalid Plan ID: \`${planId}\`\nUse \`/plans\` to see valid IDs.`, { parse_mode: "Markdown" });
        return;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const applicablePlanIds = planId ? [planId] : undefined;
    addPromoCode(code, discount, limit, expiresAt.toISOString(), applicablePlanIds);

    let confirmMsg = `✅ *Promo Code Created!*\n\n• Code: \`${code}\`\n• Discount: \`${discount}%\`\n• Limit: \`${limit}\` usages\n• Expires: \`${expiresAt.toLocaleDateString()}\``;

    if (planId) {
        confirmMsg += `\n• Restricted to Plan: \`${planId}\``;
    } else {
        confirmMsg += `\n• Restricted to: \`ALL PLANS\``;
    }

    await ctx.reply(confirmMsg, { parse_mode: "Markdown" });
}

export async function adminPlansHandler(ctx: BotContext) {
    if (!isAdmin(ctx)) return;

    let message = "📋 *Available Service Plans (IDs for Promo Codes)*\n\n";

    SERVICE_PLANS.forEach(plan => {
        message += `• *ID:* \`${plan.id}\`\n`;
        message += `  Name: ${plan.nameEN}\n`;
        message += `  Price: ${plan.price.toLocaleString()} MMK\n`;
        message += `──────────────────\n`;
    });

    await ctx.reply(message, { parse_mode: "Markdown" });
}
