import { Context, SessionFlavor } from "grammy";
import { config } from "../../config.js";
import { getRecentTransactions, getTransactionStats, addPromoCode, getMonthlyRevenue, resetTransactions } from "../../database.js";
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

interface PlanEstimate {
    name: string;
    price: number;
}

function estimatePlanFromUser(user: RemnawaveUser): PlanEstimate {
    // Match user to plan based on traffic limit
    const trafficGB = user.trafficLimitBytes / BYTES_PER_GB;

    // Very high limits (>10TB) or 0 are treated as "unlimited"
    const isUserUnlimited = user.trafficLimitBytes === 0 || trafficGB > 10000;

    // Calculate duration in days
    const created = new Date(user.createdAt);
    const expires = new Date(user.expireAt);
    const durationDays = Math.round((expires.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

    // Check if duration matches standard plans (1/3/6 months)
    const isStandardDuration =
        (durationDays >= 20 && durationDays <= 45) ||   // ~1 month
        (durationDays >= 75 && durationDays <= 105) ||  // ~3 months
        (durationDays >= 165 && durationDays <= 195);   // ~6 months

    // Non-standard duration = Replacement Key (free)
    if (!isStandardDuration) {
        return { name: 'Replacement Key', price: 0 };
    }

    // Find matching plan
    for (const plan of SERVICE_PLANS) {
        const planDays = plan.type === 'ONE_MONTH' ? 30 : plan.type === 'THREE_MONTHS' ? 90 : 180;
        const isPlanUnlimited = plan.dataLimitEN.toLowerCase().includes('unlimited');

        // Extract plan traffic in GB
        const planTrafficMatch = plan.dataLimitEN.match(/(\d+)\s*GB/i);
        const planTrafficGB = planTrafficMatch ? parseInt(planTrafficMatch[1]) : 0;

        // Match by duration (within 15 days tolerance)
        if (Math.abs(durationDays - planDays) <= 15) {
            // Both unlimited
            if (isPlanUnlimited && isUserUnlimited) {
                return { name: plan.nameEN, price: plan.price };
            }
            // Both have data limits, check if similar (within 50GB tolerance)
            if (!isPlanUnlimited && !isUserUnlimited && Math.abs(trafficGB - planTrafficGB) <= 50) {
                return { name: plan.nameEN, price: plan.price };
            }
        }
    }

    // Fallback: estimate based on duration only
    if (durationDays <= 45) {
        return isUserUnlimited
            ? { name: '1 Month Unlimited (est)', price: 10000 }
            : { name: '1 Month Lite (est)', price: 5000 };
    } else if (durationDays <= 105) {
        return isUserUnlimited
            ? { name: '3 Months Unlimited (est)', price: 27000 }
            : { name: '3 Months Lite (est)', price: 13500 };
    } else {
        return isUserUnlimited
            ? { name: '6 Months Unlimited (est)', price: 50000 }
            : { name: '6 Months Lite (est)', price: 25000 };
    }
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
    const panelPlanBreakdown: Record<string, { count: number; revenue: number; name: string }> = {};

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

        // Bot-generated usernames follow pattern: username_4digits_4hex (e.g., Rennzy0099_3838_45ea)
        const botUsernamePattern = /^.+_[a-zA-Z0-9]{4}_[a-f0-9]{4}$/;

        // Revenue is ONLY from users created this month
        // Exclude bot users (username matches bot pattern)
        for (const user of usersCreatedThisMonth) {
            const isBotUser = botUsernamePattern.test(user.username);

            if (!isBotUser) {
                const planInfo = estimatePlanFromUser(user);
                panelEstimatedRevenue += planInfo.price;

                // Track plan breakdown for panel sales
                const planKey = planInfo.name;
                if (!panelPlanBreakdown[planKey]) {
                    panelPlanBreakdown[planKey] = { count: 0, revenue: 0, name: planInfo.name };
                }
                panelPlanBreakdown[planKey].count++;
                panelPlanBreakdown[planKey].revenue += planInfo.price;
            }
        }
    } catch (error) {
        console.error("Failed to fetch panel users for revenue report:", error);
    }

    // --- Plan Breakdown (Bot Sales Only) ---
    const planBreakdown: Record<string, { count: number; revenue: number; name: string }> = {};
    for (const tx of botRevenue.transactions) {
        const planId = tx.plan_id || 'unknown';
        const plan = SERVICE_PLANS.find(p => p.id === planId);
        const planName = plan?.nameEN || planId;

        if (!planBreakdown[planId]) {
            planBreakdown[planId] = { count: 0, revenue: 0, name: planName };
        }
        planBreakdown[planId].count++;
        planBreakdown[planId].revenue += tx.amount || 0;
    }

    // Format plan breakdown lines
    const planLines = Object.values(planBreakdown)
        .sort((a, b) => b.revenue - a.revenue)
        .map(p => `├ ${p.name}: ${p.count} keys (${p.revenue.toLocaleString()} MMK)`)
        .join('\n');

    // Format panel plan breakdown lines
    const panelPlanLines = Object.values(panelPlanBreakdown)
        .sort((a, b) => b.revenue - a.revenue)
        .map(p => `├ ${p.name}: ${p.count} keys (${p.revenue.toLocaleString()} MMK)`)
        .join('\n');

    // Format numbers
    const formatMMK = (n: number) => n.toLocaleString() + " MMK";

    const message = `
📊 *Revenue Report - ${monthName} ${year}*

🤖 *Bot Sales:*
├ Keys Sold: \`${botRevenue.keysSold}\`
├ Revenue: \`${formatMMK(botRevenue.totalRevenue)}\`
└ Avg/Key: \`${botRevenue.keysSold > 0 ? formatMMK(Math.round(botRevenue.totalRevenue / botRevenue.keysSold)) : 'N/A'}\`

📦 *Bot Sales By Plan:*
${planLines || '└ No sales'}

🌐 *Panel Direct Sales (Estimated):*
├ Users: \`${Math.max(0, panelNewThisMonth - botRevenue.keysSold)}\`
├ Revenue: \`${formatMMK(panelEstimatedRevenue)}\`

📦 *Panel Sales By Plan:*
${panelPlanLines || '└ No sales'}

📈 *Combined Revenue:* \`${formatMMK(botRevenue.totalRevenue + panelEstimatedRevenue)}\`

📋 *Stats:*
├ Active Users: \`${panelActiveThisMonth}\`
└ Total Users: \`${panelUsers.length}\`

💡 /admin\\_revenue [month] [year]
`;

    await ctx.reply(message, { parse_mode: "Markdown" });
}

// Reset transactions command
export async function adminResetTxHandler(ctx: BotContext) {
    if (!isAdmin(ctx)) return;

    const args = ctx.message?.text?.split(/\s+/) || [];

    // Require explicit confirmation
    if (args[1] !== 'confirm') {
        await ctx.reply(`⚠️ *သတိပေးချက်*\n\nTransaction မှတ်တမ်းအားလုံး ဖျက်ပစ်မှာပါ။\n\nအတည်ပြုရန်: \`/admin_reset_tx confirm\``, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [[
                    { text: "✅ Confirm Reset", callback_data: "admin_reset_tx_confirm" }
                ]]
            }
        });
        return;
    }

    resetTransactions();
    await ctx.reply("✅ Transaction မှတ်တမ်းအားလုံး ဖျက်ပြီးပါပြီ။");
}

// Handle callback for reset confirmation
export async function handleAdminCallback(ctx: BotContext) {
    const callbackData = (ctx.callbackQuery as any)?.data;

    if (!callbackData || !isAdmin(ctx)) {
        await ctx.answerCallbackQuery();
        return;
    }

    if (callbackData === 'admin_reset_tx_confirm') {
        resetTransactions();
        await ctx.answerCallbackQuery({ text: "✅ Reset Complete!" });
        await ctx.editMessageText("✅ Transaction မှတ်တမ်းအားလုံး ဖျက်ပြီးပါပြီ။");
    }
}

// Generate monthly report message (standalone, no context needed)
export async function generateMonthlyReport(year: number, month: number): Promise<string> {
    const monthName = MONTH_NAMES[month - 1];

    // 1. Bot Revenue
    const botRevenue = getMonthlyRevenue(year, month);

    // 2. Panel Revenue
    let panelUsers: RemnawaveUser[] = [];
    let panelNewThisMonth = 0;
    let panelActiveThisMonth = 0;
    let panelEstimatedRevenue = 0;
    const panelPlanBreakdown: Record<string, { count: number; revenue: number; name: string }> = {};

    try {
        panelUsers = await getAllRemnawaveUsers();

        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0, 23, 59, 59);

        const usersCreatedThisMonth = panelUsers.filter(u => {
            const created = new Date(u.createdAt);
            return created.getFullYear() === year && (created.getMonth() + 1) === month;
        });

        const usersActiveThisMonth = panelUsers.filter(u => {
            const created = new Date(u.createdAt);
            const expires = new Date(u.expireAt);
            return created <= monthEnd && expires >= monthStart;
        });

        panelNewThisMonth = usersCreatedThisMonth.length;
        panelActiveThisMonth = usersActiveThisMonth.length;

        const botUsernamePattern = /^.+_[a-zA-Z0-9]{4}_[a-f0-9]{4}$/;

        for (const user of usersCreatedThisMonth) {
            const isBotUser = botUsernamePattern.test(user.username);

            if (!isBotUser) {
                const planInfo = estimatePlanFromUser(user);
                panelEstimatedRevenue += planInfo.price;

                const planKey = planInfo.name;
                if (!panelPlanBreakdown[planKey]) {
                    panelPlanBreakdown[planKey] = { count: 0, revenue: 0, name: planInfo.name };
                }
                panelPlanBreakdown[planKey].count++;
                panelPlanBreakdown[planKey].revenue += planInfo.price;
            }
        }
    } catch (error) {
        console.error("Error generating report:", error);
    }

    // Bot sales breakdown
    const planBreakdown: Record<string, { count: number; revenue: number; name: string }> = {};
    for (const tx of botRevenue.transactions) {
        const planId = tx.plan_id || 'unknown';
        const plan = SERVICE_PLANS.find(p => p.id === planId);
        const planName = plan?.nameEN || planId;

        if (!planBreakdown[planId]) {
            planBreakdown[planId] = { count: 0, revenue: 0, name: planName };
        }
        planBreakdown[planId].count++;
        planBreakdown[planId].revenue += tx.amount || 0;
    }

    const planLines = Object.values(planBreakdown)
        .sort((a, b) => b.revenue - a.revenue)
        .map(p => `├ ${p.name}: ${p.count} keys (${p.revenue.toLocaleString()} MMK)`)
        .join('\n');

    const panelPlanLines = Object.values(panelPlanBreakdown)
        .sort((a, b) => b.revenue - a.revenue)
        .map(p => `├ ${p.name}: ${p.count} keys (${p.revenue.toLocaleString()} MMK)`)
        .join('\n');

    const formatMMK = (n: number) => n.toLocaleString() + " MMK";

    return `
📊 *Monthly Revenue Report - ${monthName} ${year}*
🗓️ Auto-generated on ${new Date().toLocaleDateString()}

🤖 *Bot Sales:*
├ Keys Sold: \`${botRevenue.keysSold}\`
├ Revenue: \`${formatMMK(botRevenue.totalRevenue)}\`
└ Avg/Key: \`${botRevenue.keysSold > 0 ? formatMMK(Math.round(botRevenue.totalRevenue / botRevenue.keysSold)) : 'N/A'}\`

📦 *Bot Sales By Plan:*
${planLines || '└ No sales'}

🌐 *Panel Direct Sales (Estimated):*
├ Users: \`${Math.max(0, panelNewThisMonth - botRevenue.keysSold)}\`
├ Revenue: \`${formatMMK(panelEstimatedRevenue)}\`

📦 *Panel Sales By Plan:*
${panelPlanLines || '└ No sales'}

📈 *Combined Revenue:* \`${formatMMK(botRevenue.totalRevenue + panelEstimatedRevenue)}\`

📋 *Stats:*
├ Active Users: \`${panelActiveThisMonth}\`
└ Total Users: \`${panelUsers.length}\`
`;
}

// Monthly report scheduler
export function startMonthlyReportScheduler(bot: any) {
    const checkAndSendReport = async () => {
        const now = new Date();

        // Check if it's the 1st of the month and 9 AM (local time)
        if (now.getDate() === 1 && now.getHours() === 9 && now.getMinutes() === 0) {
            // Get previous month
            let targetMonth = now.getMonth(); // 0-11 (current month - 1 for previous)
            let targetYear = now.getFullYear();

            if (targetMonth === 0) {
                targetMonth = 12;
                targetYear--;
            }

            console.log(`📊 Generating auto monthly report for ${targetMonth}/${targetYear}...`);

            try {
                const report = await generateMonthlyReport(targetYear, targetMonth);

                // Send to all admin users
                for (const adminId of config.adminUserIds) {
                    try {
                        await bot.api.sendMessage(adminId, report, { parse_mode: "Markdown" });
                        console.log(`✅ Sent monthly report to admin ${adminId}`);
                    } catch (err) {
                        console.error(`Failed to send report to admin ${adminId}:`, err);
                    }
                }
            } catch (error) {
                console.error("Failed to generate monthly report:", error);
            }
        }
    };

    // Check every minute
    setInterval(checkAndSendReport, 60 * 1000);
    console.log("📅 Monthly report scheduler started (runs on 1st of month at 9 AM)");
}
