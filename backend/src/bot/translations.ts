export type Language = 'en' | 'mm';

export interface Translation {
    // Commands & Menus
    welcome_message: string;
    choose_language: string;
    choose_plan: string;
    choose_payment: string;
    plan_details_title: string;
    duration_label: string;
    data_label: string;
    description_label: string;

    // Payment Instructions
    payment_instructions_title: string;
    transfer_details: string;
    account_name: string;
    phone_number: string;
    amount: string;
    step_1: string;
    step_2: string;
    step_3: string;
    step_4: string;
    waiting_screenshot: string;
    vpn_warning: string;
    auto_generation_note: string;

    // Verification
    verifying_payment: string;
    please_wait: string;
    payment_verified: string;
    generating_key: string;
    duplicate_transaction: string;
    duplicate_msg: string;
    verification_failed: string;
    rate_limit_title: string;
    rate_limit_msg: string;
    slow_down: string;
    wait_seconds: string;
    tips_title: string;
    tip_success: string;
    tip_receipt: string;
    tip_mismatch: string;
    need_help: string;
    contact_support: string;
    unexpected_error: string;
    not_expecting_photo: string;
    use_start_first: string;
    plan_not_found: string;

    // Success Screen
    success_title: string;
    subscription_ready: string;
    plan_label: string;
    expires_label: string;
    amount_paid_label: string;
    transaction_label: string;
    your_key_label: string;
    how_to_use_title: string;
    how_to_step_1: string;
    how_to_step_2: string;
    how_to_step_3: string;
    how_to_step_4: string;
    how_to_step_5: string;
    open_link_label: string;
    server_switch_warning: string;
    thank_you: string;

    // Help
    help_title: string;
    vpn_client_title: string;
    happ_proxy_android: string;
    happ_proxy_ios: string;
    commands_title: string;
    cmd_start: string;
    cmd_plans: string;
    cmd_help: string;
    how_to_get_key_title: string;
    get_step_1: string;
    get_step_2: string;
    get_step_3: string;
    get_step_4: string;
    get_step_5: string;
    how_to_use_happ_title: string;
    use_step_1: string;
    use_step_2: string;
    use_step_3: string;
    use_step_4: string;
    contact_support_title: string;
    contact_support_msg: string;
    promo_prompt: string;
    promo_applied: string;
    promo_invalid: string;
    promo_invalid_plan: string;
    promo_expired: string;
    promo_button: string;
    enter_promo_title: string;
    claim_free_button: string;
    claiming_free: string;
}

export const translations: Record<Language, Translation> = {
    en: {
        welcome_message: "🌊 *Welcome to Wavy VPN Store!*\n\nHigh-speed, secure, and reliable VPN access at your fingertips. Choose a plan below to get started.",
        choose_language: "Please choose your language:",
        choose_plan: "Select a subscription plan:",
        choose_payment: "Select your payment method:",
        plan_details_title: "Plan Details",
        duration_label: "Duration",
        data_label: "Data",
        description_label: "Description",

        payment_instructions_title: "Payment instructions",
        transfer_details: "📋 *Transfer Details:*",
        account_name: "Account Name",
        phone_number: "Phone Number",
        amount: "Amount",
        step_1: "1. Open your {provider} app",
        step_2: "2. Transfer *{amount} MMK* to the number above",
        step_3: "3. Take a screenshot of the successful payment",
        step_4: "4. Send the screenshot here",
        waiting_screenshot: "⏳ *Waiting for your payment screenshot...*",
        vpn_warning: "⚠️ *IMPORTANT:* Do *NOT* write the word \"VPN\" in the payment note/description. If this keyword is detected, your payment will be rejected and no key will be issued.",
        auto_generation_note: "_Your subscription key will be generated automatically after verification._",

        verifying_payment: "🔄 *Verifying your payment...*",
        please_wait: "Please wait, this may take a few seconds.",
        payment_verified: "✅ *Payment Verified!*",
        generating_key: "🔑 Generating your subscription key...",
        duplicate_transaction: "❌ *Duplicate Transaction*",
        duplicate_msg: "This payment has already been used. Please make a new payment.",
        verification_failed: "❌ *Verification Failed*",
        rate_limit_title: "❌ *Service Busy*",
        rate_limit_msg: "The verification service is temporarily overloaded. Please wait a moment and try again.\n\n💡 Your payment screenshot has been received. Try sending it again in 1-2 minutes.",
        slow_down: "⏳ *Slow down!*",
        wait_seconds: "Please wait *{seconds} seconds* before sending another screenshot to avoid spamming the service.",
        tips_title: "💡 *Tips:*",
        tip_success: "Make sure the payment was successful",
        tip_receipt: "The screenshot should show the full receipt",
        tip_mismatch: "Account name/number must match",
        need_help: "Need help? Click the button below.",
        contact_support: "💬 Contact Support",
        unexpected_error: "❌ *Error*\n\nAn unexpected error occurred. Please try again or contact support.",
        not_expecting_photo: "📸 I received your photo, but I'm not expecting a payment screenshot right now.",
        use_start_first: "Please use /start to select a plan first.",
        plan_not_found: "❌ Could not find your selected plan. Please use /start to try again.",

        success_title: "🎉 *Success!*",
        subscription_ready: "Your VPN subscription is ready!",
        plan_label: "Plan",
        expires_label: "Expires",
        amount_paid_label: "Amount Paid",
        transaction_label: "Transaction",
        your_key_label: "Your Subscription URL",
        how_to_use_title: "📱 *How to use with Happ Proxy:*",
        how_to_step_1: "1. Copy the URL above",
        how_to_step_2: "2. [Download Happ Proxy for Android](https://play.google.com/store/apps/details?id=com.happproxy&hl=en)",
        how_to_step_3: "3. [Download Happ Proxy for iOS](https://apps.apple.com/sg/app/happ-proxy-utility/id6504287215)",
        how_to_step_4: "4. Open the app, add a new subscription, and paste your URL.",
        how_to_step_5: "5. Connect and enjoy!",
        open_link_label: "🔗 Open Subscription Link",
        server_switch_warning: "⚠️ *WARNING:* Do not switch countries (servers) too fast! Rapidly changing your location may cause Facebook to temporarily disable your account for security reasons.",
        thank_you: "Thank you for choosing Wavy! 🌊",

        help_title: "🆘 *Wavy VPN Bot Help*",
        vpn_client_title: "*Recommended VPN Client:*",
        happ_proxy_android: "Download Happ Proxy for Android",
        happ_proxy_ios: "Download Happ Proxy for iOS",
        commands_title: "*Commands:*",
        cmd_start: "/start - Start the bot and select a plan",
        cmd_plans: "/plans - View all available plans",
        cmd_help: "/help - Show this help message",
        how_to_get_key_title: "*How to get your VPN key:*",
        get_step_1: "1. Select a plan using /start",
        get_step_2: "2. Choose your payment method",
        get_step_3: "3. Transfer the exact amount provided",
        get_step_4: "4. Send a screenshot of your successful payment",
        get_step_5: "5. Receive your subscription URL instantly!",
        how_to_use_happ_title: "*How to use with Happ Proxy:*",
        use_step_1: "1. Copy the subscription URL you receive",
        use_step_2: "2. Open *Happ Proxy*",
        use_step_3: "3. Tap the \"Add\" button and paste your URL",
        use_step_4: "4. Connect and enjoy your secure connection!",
        contact_support_title: "*Contact Support:*",
        contact_support_msg: "If you need help, click the button below to message us directly.",
        promo_prompt: "Please enter your promo code:",
        promo_applied: "✅ Promo code applied! You got a {discount}% discount.",
        promo_invalid: "❌ Invalid promo code.",
        promo_invalid_plan: "❌ This promo code is not applicable to your selected plan.",
        promo_expired: "❌ This promo code has expired or reached its usage limit.",
        promo_button: "🎟️ Have a Promo Code?",
        enter_promo_title: "Enter Promo Code",
        claim_free_button: "✨ Claim for Free",
        claiming_free: "🔄 Claiming your free subscription...",
    },
    mm: {
        welcome_message: "🌊 *Wavy VPN Store မှ ကြိုဆိုပါတယ်!*",
        choose_language: "ကျေးဇူးပြု၍ ဘာသာစကား ရွေးချယ်ပေးပါ-",
        choose_plan: "ဝယ်ယူလိုသည့် ပလန်ကို ရွေးချယ်ပါ-",
        choose_payment: "ငွေပေးချေမည့် နည်းလမ်းကို ရွေးချယ်ပါ-",
        plan_details_title: "ပလန်အသေးစိတ်",
        duration_label: "သက်တမ်း",
        data_label: "ဒေတာ",
        description_label: "အသေးစိတ်",

        payment_instructions_title: "ငွေပေးချေရန် လမ်းညွှန်ချက်များ",
        transfer_details: "📋 *ငွေလွှဲရန် အချက်အလက်များ:*",
        account_name: "အကောင့်အမည်",
        phone_number: "ဖုန်းနံပါတ်",
        amount: "ပမာဏ",
        step_1: "၁။ သင်၏ {provider} app ကိုဖွင့်ပါ",
        step_2: "၂။ အထက်ပါဖုန်းနံပါတ်သို့ *{amount} MMK* အတိအကျ လွှဲပေးပါ",
        step_3: "၃။ ငွေလွှဲအောင်မြင်ကြောင်း screenshot (ဓါတ်ပုံ) ရိုက်ထားပါ",
        step_4: "၄။ ၎င်း screenshot ကို ဤနေရာသို့ ပို့ပေးပါ",
        waiting_screenshot: "⏳ *ငွေလွှဲ screenshot ကို စောင့်ဆိုင်းနေပါသည်...*",
        vpn_warning: "⚠️ *အရေးကြီးချက်:* ငွေလွှဲသည့်အခါ မှတ်ချက် (Note/Description) တွင် \"VPN\" ဟု *မရေးပါနှင့်*။ ထိုစာသား ပါဝင်ပါက ငွေလွှဲမှုကို ငြင်းပယ်မည်ဖြစ်ပြီး key ရရှိမည် မဟုတ်ပါ။",
        auto_generation_note: "_ငွေလွှဲမှု မှန်ကန်ကြောင်း စစ်ဆေးပြီးပါက VPN key ကို အလိုအလျောက် ထုတ်ပေးမည်ဖြစ်ပါသည်။_",

        verifying_payment: "🔄 *ငွေလွှဲမှုကို စစ်ဆေးနေပါသည်...*",
        please_wait: "ခဏ စောင့်ဆိုင်းပေးပါ၊ စက္ကန့်အနည်းငယ် ကြာနိုင်ပါသည်။",
        payment_verified: "✅ *ငွေလွှဲမှု မှန်ကန်ပါသည်!*",
        generating_key: "🔑 VPN key ကို ထုတ်ပေးနေပါသည်...",
        duplicate_transaction: "❌ *ငွေလွှဲမှု ထပ်နေပါသည်*",
        duplicate_msg: "ဤငွေလွှဲမှုကို အသုံးပြုပြီးသား ဖြစ်ပါသည်။ အသစ်တစ်ဖန် ထပ်မံလုပ်ဆောင်ပေးပါ။",
        verification_failed: "❌ *စစ်ဆေးမှု မအောင်မြင်ပါ*",
        rate_limit_title: "❌ *ဝန်ဆောင်မှု မအားသေးပါ*",
        rate_limit_msg: "စစ်ဆေးသည့် ဝန်ဆောင်မှု မအားလပ်သေးပါ။ ခဏနေမှ ထပ်မံကြိုးစားပေးပါ။\n\n💡 သင်၏ screenshot ကို လက်ခံရရှိထားပါသည်။ ၁ မိနစ် သို့မဟုတ် ၂ မိနစ်ခန့်အကြာတွင် ထပ်မံ ပို့ကြည့်ပေးပါ။",
        slow_down: "⏳ *ခေတ္တစောင့်ပေးပါ!*",
        wait_seconds: "Spam ဖြစ်ခြင်းကို ကာကွယ်ရန် နောက်ထပ် screenshot မပို့မီ *{seconds} စက္ကန့်* ခန့် စောင့်ပေးပါ။",
        tips_title: "💡 *အကြံပြုချက်များ:*",
        tip_success: "ငွေလွှဲမှု အောင်မြင်ကြောင်း သေချာပါစေ",
        tip_receipt: "Screenshot တွင် ဘောက်ချာတစ်ခုလုံး မြင်ရပါစေ",
        tip_mismatch: "အကောင့်အမည်နှင့် နံပါတ် မှန်ကန်ပါစေ",
        need_help: "အကူအညီ လိုအပ်ပါက အောက်ပါခလုတ်ကို နှိပ်ပါ။",
        contact_support: "💬 အကူအညီ ရယူရန်",
        unexpected_error: "❌ *အမှားအယွင်း* \n\nမမျှော်လင့်ထားသော အမှားတစ်ခု ဖြစ်ပေါ်ခဲ့ပါသည်။ ထပ်မံကြိုးစားကြည့်ပါ သို့မဟုတ် အကူအညီ ရယူပါ။",
        not_expecting_photo: "📸 ဓါတ်ပုံ လက်ခံရရှိပါသည်၊ သို့သော် ယခုအချိန်တွင် ငွေလွှဲ screenshot စောင့်နေခြင်း မဟုတ်ပါ။",
        use_start_first: "ကျေးဇူးပြု၍ /start ကို အသုံးပြုပြီး ပလန်အရင် ရွေးချယ်ပေးပါ။",
        plan_not_found: "❌ သင်ရွေးချယ်ထားသော ပလန်ကို ရှာမတွေ့ပါ။ /start ကို အသုံးပြုပြီး ထပ်မံ ကြိုးစားပေးပါ။",

        success_title: "🎉 *အောင်မြင်ပါသည်!*",
        subscription_ready: "သင်၏ VPN အကောင့် အဆင်သင့်ဖြစ်ပါပြီ!",
        plan_label: "ပလန်",
        expires_label: "သက်တမ်းကုန်ဆုံးမည့်ရက်",
        amount_paid_label: "ပေးချေပြီးသော ပမာဏ",
        transaction_label: "ငွေလွှဲအမှတ်",
        your_key_label: "သင်၏ Subscription URL",
        how_to_use_title: "📱 *Happ Proxy ဖြင့် အသုံးပြုနည်း:*",
        how_to_step_1: "၁။ အထက်ပါ URL ကို copy ယူပါ",
        how_to_step_2: "၂။ [Happ Proxy Play Store မှ ဒေါင်းရန်](https://play.google.com/store/apps/details?id=com.happproxy&hl=en)",
        how_to_step_3: "၃။ [Happ Proxy iOS အတွက် ဒေါင်းရန်](https://apps.apple.com/sg/app/happ-proxy-utility/id6504287215)",
        how_to_step_4: "၄။ App ကိုဖွင့်ပြီး subscription အသစ်ထည့်ရန် URL ကို paste လုပ်ပါ",
        how_to_step_5: "၅။ Connect နှိပ်ပြီး အသုံးပြုနိုင်ပါပြီ!",
        open_link_label: "🔗 မူရင်းလင့်ခ်ကို ဖွင့်ရန်",
        server_switch_warning: "⚠️ *သတိပေးချက်:* ဆာဗာများကို ခဏခဏ အလွန်မြန်စွာ မပြောင်းပါနှင့်! တည်နေရာအမျိုးမျိုးသို့ ခဏချင်းပြောင်းလဲခြင်းကြောင့် သင်၏ Facebook အကောင့်ကို လုံခြုံရေးအရ ခေတ္တပိတ်ပင်ခြင်း (Disable) ခံရနိုင်ပါသည်။",
        thank_you: "Wavy ကို ရွေးချယ်အသုံးပြုပေးသည့်အတွက် ကျေးဇူးတင်ပါသည်! 🌊",

        help_title: "🆘 *Wavy VPN Bot အကူအညီ*",
        vpn_client_title: "*အသုံးပြုရန် အကြံပြုသည့် App:*",
        happ_proxy_android: "Happ Proxy (Android) ကို ဒေါင်းလုဒ်ဆွဲရန်",
        happ_proxy_ios: "Happ Proxy (iOS) ကို ဒေါင်းလုဒ်ဆွဲရန်",
        commands_title: "*အသုံးပြုနိုင်သည့် Command များ:*",
        cmd_start: "/start - ဘောပ်ကို စတင်ရန်နှင့် ပလန်ရွေးရန်",
        cmd_plans: "/plans - ရရှိနိုင်သော ပလန်များကို ကြည့်ရန်",
        cmd_help: "/help - ဤအကူအညီစာမျက်နှာကို ကြည့်ရန်",
        how_to_get_key_title: "*VPN key ရယူနည်း:*",
        get_step_1: "၁။ /start ကိုနှိပ်ပြီး ပလန်တစ်ခု ရွေးချယ်ပါ",
        get_step_2: "၂။ ငွေပေးချေမည့်နည်းလမ်းကို ရွေးပါ",
        get_step_3: "၃။ သတ်မှတ်ထားသည့် ပမာဏအတိုင်း ငွေလွှဲပါ",
        get_step_4: "၄။ ငွေလွှဲအောင်မြင်သည့် screenshot ကို ပို့ပေးပါ",
        get_step_5: "၅။ သင်၏ VPN key ကို ချက်ချင်း ရရှိပါမည်!",
        how_to_use_happ_title: "*Happ Proxy ဖြင့် အသုံးပြုနည်း:*",
        use_step_1: "၁။ ရရှိလာသော subscription URL ကို copy ယူပါ",
        use_step_2: "၂။ *Happ Proxy* app ကိုဖွင့်ပါ",
        use_step_3: "၃။ \"Add\" ကိုနှိပ်ပြီး URL ကို paste လုပ်ပါ",
        use_step_4: "၄။ Connect လုပ်ပြီး အသုံးပြုနိုင်ပါပြီ!",
        contact_support_title: "*အကူအညီ ရယူရန်:*",
        contact_support_msg: "အကူအညီ လိုအပ်ပါက အောက်ပါခလုတ်ကို နှိပ်၍ တိုက်ရိုက် မက်ဆေ့ခ်ျ ပို့နိုင်ပါသည်။",
        promo_prompt: "ပရိုမိုကုဒ် (Promo Code) ကို ရိုက်ထည့်ပါ-",
        promo_applied: "✅ ပရိုမိုကုဒ် အောင်မြင်ပါသည်။ သင် {discount}% လျှော့စျေး ရရှိပါသည်။",
        promo_invalid: "❌ ပရိုမိုကုဒ် မှားယွင်းနေပါသည်။",
        promo_invalid_plan: "❌ ဤပရိုမိုကုဒ်မှာ သင်ရွေးချယ်ထားသော ပလန်အတွက် အကျုံးမဝင်ပါ။",
        promo_expired: "❌ ဤပရိုမိုကုဒ်မှာ သက်တမ်းကုန်ဆုံးသွားပြီ သို့မဟုတ် အကြိမ်ရေ ပြည့်သွားပါပြီ။",
        promo_button: "🎟️ Promo Code ရှိပါသလား?",
        enter_promo_title: "Promo Code ရိုက်ထည့်ရန်",
        claim_free_button: "✨ အခမဲ့ရယူရန်",
        claiming_free: "🔄 အခမဲ့အကောင့် ထုတ်ပေးနေပါသည်...",
    }
};
