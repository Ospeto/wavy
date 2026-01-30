import { Context, SessionFlavor, InlineKeyboard } from "grammy";
import { config } from "../../config.js";
import { getRecentTransactions, getTransactionStats, addPromoCode, getMonthlyRevenue, resetTransactions } from "../../database.js";
import { SERVICE_PLANS } from "../constants.js";
import { SessionData, BotContext } from "../types.js";
import { getAllRemnawaveUsers, RemnawaveUser } from "../../remnawave.js";
import { getGeminiModel, setGeminiModel } from "../../database.js";

function isAdmin(ctx: BotContext): boolean {
    const userId = ctx.from?.id?.toString();
    if (!userId) return false;
    return config.adminUserIds.includes(userId);
}

// --- Admin Dashboard ---
export async function adminHandler(ctx: BotContext) {
    if (!isAdmin(ctx)) {
        console.log(`🚫 Unauthorized admin access attempt by ${ctx.from?.id}`);
        return;
    }

    const stats = getTransactionStats();

    const message = `
📊 *Wavy System Dashboard*

💰 *Key Metrics:*
• Total Txs: \`${stats.total}\`
• Revenue: \`${stats.totalRevenue?.toLocaleString() || 0}\` MMK
• Pending: \`${stats.pending}\`
• Failed: \`${stats.failed}\`

👇 *Select an action:*
`;

    const keyboard = new InlineKeyboard()
        .text("📊 Revenue Report", "admin_rev_init")
        .text("📝 Transactions", "admin_tx_list")
        .row()
        .text("⚙️ AI Model", "admin_model_menu")
        .text("📋 View Plans", "admin_plans_list")
        .row()
        .text("🗑️ Reset DB", "admin_reset_init");

    try {
        await ctx.reply(message, { parse_mode: "Markdown", reply_markup: keyboard });
    } catch (error) {
        console.error("Dashboard error:", error);
        await ctx.reply("Error loading dashboard.");
    }
}

// --- Callback Router ---
export async function handleAdminCallback(ctx: BotContext) {
    const callbackData = (ctx.callbackQuery as any)?.data as string;

    if (!callbackData || !isAdmin(ctx)) {
        await ctx.answerCallbackQuery();
        return;
    }

    // Dashboard
    if (callbackData === 'admin_home') {
        const stats = getTransactionStats();
        const message = `
📊 *Wavy System Dashboard*

💰 *Key Metrics:*
• Total Txs: \`${stats.total}\`
• Revenue: \`${stats.totalRevenue?.toLocaleString() || 0}\` MMK
• Pending: \`${stats.pending}\`
• Failed: \`${stats.failed}\`

👇 *Select an action:*
`;
        const keyboard = new InlineKeyboard()
            .text("📊 Revenue Report", "admin_rev_init")
            .text("📝 Transactions", "admin_tx_list")
            .row()
            .text("⚙️ AI Model", "admin_model_menu")
            .text("📋 View Plans", "admin_plans_list")
            .row()
            .text("🗑️ Reset DB", "admin_reset_init");

        await ctx.editMessageText(message, { parse_mode: "Markdown", reply_markup: keyboard });
        await ctx.answerCallbackQuery();
        return;
    }

    // Reset Flow
    if (callbackData === 'admin_reset_init') {
        const keyboard = new InlineKeyboard()
            .text("✅ Confirm Reset", "admin_reset_tx_confirm")
            .row()
            .text("🔙 Cancel", "admin_home");

        await ctx.editMessageText(`⚠️ *DANGER ZONE*\n\nAre you sure you want to delete ALL transaction history? This cannot be undone.`, {
            parse_mode: "Markdown",
            reply_markup: keyboard
        });
        await ctx.answerCallbackQuery();
    }

    else if (callbackData === 'admin_reset_tx_confirm') {
        resetTransactions();
        await ctx.answerCallbackQuery({ text: "✅ Reset Complete!" });
        await ctx.editMessageText("✅ All transaction history has been wiped.", {
            reply_markup: new InlineKeyboard().text("🔙 Back to Dashboard", "admin_home")
        });
    }

    // Model Menu Flow
    else if (callbackData === 'admin_model_menu') {
        await showModelMenu(ctx);
    }
    else if (callbackData.startsWith('admin_set_model:')) {
        const model = callbackData.split(':')[1];
        setGeminiModel(model);
        await ctx.answerCallbackQuery({ text: `Model set to ${model}` });
        await showModelMenu(ctx); // Refresh menu to show selection
    }

    // Transactions Flow
    else if (callbackData === 'admin_tx_list') {
        // Re-use existing handler logic but adapted for callback
        await adminTxHandler(ctx);
        await ctx.answerCallbackQuery();
    }

    // Plans Flow
    else if (callbackData === 'admin_plans_list') {
        // Re-use existing handler logic
        await adminPlansHandler(ctx);
        await ctx.answerCallbackQuery();
    }

    // Revenue Flow initialization
    else if (callbackData === 'admin_rev_init') {
        const now = new Date();
        await showRevenueReport(ctx, now.getMonth() + 1, now.getFullYear());
    }
    // Revenue Navigation
    else if (callbackData.startsWith('admin_rev:')) {
        // Format: admin_rev:month:year
        const parts = callbackData.split(':');
        const month = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        await showRevenueReport(ctx, month, year);
    }
}

// --- Admin Sub-Handlers (Interactive) ---

async function showModelMenu(ctx: BotContext) {
    const currentModel = getGeminiModel();
    const validModels = [
        "gemini-2.5-flash",
        "gemini-3-pro-preview",
        "gemini-3-flash-preview"
    ];

    let msg = `🤖 *AI Model Configuration*\n\nCurrent Active Model: \`${currentModel}\`\n\nTap a model to activate it:`;

    const keyboard = new InlineKeyboard();
    validModels.forEach(m => {
        const label = m === currentModel ? `✅ ${m}` : `⚪️ ${m}`;
        keyboard.text(label, `admin_set_model:${m}`).row();
    });
    keyboard.text("🔙 Back", "admin_home");

    try {
        await ctx.editMessageText(msg, { parse_mode: "Markdown", reply_markup: keyboard });
    } catch (e) {
        // If message to edit is not found or content same, or triggered via command
        await ctx.reply(msg, { parse_mode: "Markdown", reply_markup: keyboard });
    }
}

async function showRevenueReport(ctx: BotContext, month: number, year: number) {
    // Handle month overflow/underflow
    if (month > 12) { month = 1; year++; }
    if (month < 1) { month = 12; year--; }

    const report = await generateMonthlyReport(year, month);

    const keyboard = new InlineKeyboard()
        .text("⬅️ Prev", `admin_rev:${month - 1}:${year}`)
        .text("Next ➡️", `admin_rev:${month + 1}:${year}`)
        .row()
        .text("🔙 Back to Dashboard", "admin_home");

    const header = `📅 *Revenue Browser* (${month}/${year})\n\n`;

    try {
        await ctx.editMessageText(header + report, { parse_mode: "Markdown", reply_markup: keyboard });
        await ctx.answerCallbackQuery();
    } catch (e) {
        await ctx.reply(header + report, { parse_mode: "Markdown", reply_markup: keyboard });
    }
}

export async function adminModelHandler(ctx: BotContext) {
    if (!isAdmin(ctx)) return;
    await showModelMenu(ctx);
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

// --- Legacy Command Wrappers (Redirect to Interactive UI) ---

export async function adminRevenueHandler(ctx: BotContext) {
    if (!isAdmin(ctx)) return;
    const now = new Date();
    // Default to current month, arguments ignored in favor of interactive UI
    await showRevenueReport(ctx, now.getMonth() + 1, now.getFullYear());
}

export async function adminResetTxHandler(ctx: BotContext) {
    if (!isAdmin(ctx)) return;

    // Redirect to the interactive reset flow
    const keyboard = new InlineKeyboard()
        .text("✅ Confirm Reset", "admin_reset_tx_confirm")
        .row()
        .text("🔙 Cancel", "admin_home");

    await ctx.reply(`⚠️ *DANGER ZONE*\n\nAre you sure you want to delete ALL transaction history? This cannot be undone.`, {
        parse_mode: "Markdown",
        reply_markup: keyboard
    });
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
