import { Context, SessionFlavor, InlineKeyboard } from "grammy";
import { translations } from "../translations.js";
import { SessionData, BotContext } from "../types.js";

export async function helpHandler(ctx: BotContext) {
    const lang = ctx.session.language || 'en';
    const t = translations[lang];

    const helpMessage = `
${t.help_title}

${t.vpn_client_title}
Our system works best with the **Happ Proxy** app.
• [${t.happ_proxy_android}](https://play.google.com/store/apps/details?id=com.happproxy&hl=en)
• [${t.happ_proxy_ios}](https://apps.apple.com/sg/app/happ-proxy-utility/id6504287215)

${t.commands_title}
${t.cmd_start}
${t.cmd_plans}
${t.cmd_help}
/language - ${lang === 'mm' ? 'ဘာသာစကားပြောင်းရန်' : 'Change language'}

${t.how_to_get_key_title}
${t.get_step_1}
${t.get_step_2}
${t.get_step_3}
${t.get_step_4}
${t.get_step_5}

${t.how_to_use_happ_title}
${t.use_step_1}
${t.use_step_2}
${t.use_step_3}
${t.use_step_4}

${t.server_switch_warning}

${t.contact_support_title}
${t.contact_support_msg}
`;

    const keyboard = new InlineKeyboard().url(t.contact_support, "https://t.me/ospeto");

    await ctx.reply(helpMessage, {
        parse_mode: "Markdown",
        reply_markup: keyboard
    });
}
