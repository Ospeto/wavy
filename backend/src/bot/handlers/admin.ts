import { Context, SessionFlavor } from "grammy";
import { config } from "../../config.js";
import { getRecentTransactions, getTransactionStats, addPromoCode, getMonthlyRevenue } from "../../database.js";
import { SERVICE_PLANS } from "../constants.js";
import { SessionData, BotContext } from "../types.js";
import { getAllRemnawaveUsers, RemnawaveUser } from "../../remnawave.js";

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
\`/admin_revenue [month] [year]\` - Revenue report
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

// --- Revenue Report ---
const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const BYTES_PER_GB = 1073741824;

function estimatePlanFromUser(user: RemnawaveUser): number {
    // Match user to plan based on traffic limit
    const trafficGB = user.trafficLimitBytes / BYTES_PER_GB;

    // Calculate duration in days
    const created = new Date(user.createdAt);
    const expires = new Date(user.expireAt);
    const durationDays = Math.round((expires.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

    // Find matching plan
    for (const plan of SERVICE_PLANS) {
        const planDays = plan.type === 'ONE_MONTH' ? 30 : plan.type === 'THREE_MONTHS' ? 90 : 180;
        const isUnlimited = plan.dataLimitEN.toLowerCase().includes('unlimited');
        const planTrafficGB = isUnlimited ? 0 : parseInt(plan.dataLimitEN.match(/\d+/)?.[0] || '0');

        // Match by duration (within 10 days tolerance) and traffic
        if (Math.abs(durationDays - planDays) <= 10) {
            if (isUnlimited && user.trafficLimitBytes === 0) {
                return plan.price;
            }
            if (!isUnlimited && Math.abs(trafficGB - planTrafficGB) <= 10) {
                return plan.price;
            }
        }
    }

    // Fallback: use average price
    return 10000;
}

export async function adminRevenueHandler(ctx: BotContext) {
    if (!isAdmin(ctx)) return;

    // Parse arguments: /admin_revenue [month] [year]
    const args = ctx.message?.text?.split(/\s+/) || [];
    const now = new Date();
    let month = now.getMonth() + 1; // 1-12
    let year = now.getFullYear();

    if (args[1]) {
        const parsedMonth = parseInt(args[1]);
        if (parsedMonth >= 1 && parsedMonth <= 12) {
            month = parsedMonth;
        }
    }
    if (args[2]) {
        const parsedYear = parseInt(args[2]);
        if (parsedYear >= 2020 && parsedYear <= 2100) {
            year = parsedYear;
        }
    }

    const monthName = MONTH_NAMES[month - 1];
    await ctx.reply(`⏳ Generating revenue report for ${monthName} ${year}...`);

    // 1. Bot Revenue (from transactions.json)
    const botRevenue = getMonthlyRevenue(year, month);

    // 2. Panel Revenue (from Remnawave API)
    let panelUsers: RemnawaveUser[] = [];
    let panelNewThisMonth = 0;
    let panelActiveThisMonth = 0;
    let panelEstimatedRevenue = 0;

    try {
        panelUsers = await getAllRemnawaveUsers();

        // Get first and last day of target month for filtering
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0, 23, 59, 59);

        // NEW subscriptions created in this month (revenue is counted here)
        const usersCreatedThisMonth = panelUsers.filter(u => {
            const created = new Date(u.createdAt);
            return created.getFullYear() === year && (created.getMonth() + 1) === month;
        });

        // ACTIVE subscriptions (bought before/during this month, still valid)
        const usersActiveThisMonth = panelUsers.filter(u => {
            const created = new Date(u.createdAt);
            const expires = new Date(u.expireAt);
            return created <= monthEnd && expires >= monthStart;
        });

        panelNewThisMonth = usersCreatedThisMonth.length;
        panelActiveThisMonth = usersActiveThisMonth.length;

        // Revenue is ONLY from users created this month
        // AND we must exclude users created by the Bot (description starts with "Wavy:")
        // to avoid double counting and incorrect pricing (since bot revenue is already accurate)
        let manualPanelSalesCount = 0;

        for (const user of usersCreatedThisMonth) {
            const isBotUser = user.description && user.description.startsWith("Wavy:");

            if (!isBotUser) {
                panelEstimatedRevenue += estimatePlanFromUser(user);
                manualPanelSalesCount++;
            }
        }

        // Adjust "New This Month" display if needed, but for "Panel Stats" usually we show TOTAL.
        // However, for Revenue, we strictly separate them.
    } catch (error) {
        console.error("Failed to fetch panel users for revenue report:", error);
    }

    // Format numbers
    const formatMMK = (n: number) => n.toLocaleString() + " MMK";

    const message = `
📊 *Revenue Report - ${monthName} ${year}*

🤖 *Bot Sales:*
├ Keys Sold: \`${botRevenue.keysSold}\`
├ Revenue: \`${formatMMK(botRevenue.totalRevenue)}\`
└ Avg/Key: \`${botRevenue.keysSold > 0 ? formatMMK(Math.round(botRevenue.totalRevenue / botRevenue.keysSold)) : 'N/A'}\`

🌐 *Panel Direct Sales (Estimated):*
├ New Users: \`${panelNewThisMonth - botRevenue.keysSold}\` (Manual)
├ Revenue: \`${formatMMK(panelEstimatedRevenue)}\`
└ Non-Bot Only

📈 *Combined Revenue:* \`${formatMMK(botRevenue.totalRevenue + panelEstimatedRevenue)}\`

📋 *Overall Stats:*
├ Total Active Users: \`${panelActiveThisMonth}\`
└ Total Users (All Time): \`${panelUsers.length}\`

ℹ️ _Bot users excluded from Panel Revenue to prevent double counting._
💡 Usage: /admin\\_revenue [month] [year]
`;

    await ctx.reply(message, { parse_mode: "Markdown" });
}
