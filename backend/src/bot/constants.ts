// Service plan types
export type PlanType = "ONE_MONTH" | "THREE_MONTHS" | "SIX_MONTHS";

export interface ServicePlan {
    id: string;
    nameEN: string;
    nameMM: string;
    price: number;
    currency: string;
    durationEN: string;
    durationMM: string;
    type: PlanType;
    dataLimitEN: string;
    dataLimitMM: string;
    descriptionEN: string;
    descriptionMM: string;
}

export interface PaymentMethod {
    id: string;
    name: string;
    provider: string;
    accountName: string;
    accountNumber: string;
    emoji: string;
}

export const SERVICE_PLANS: ServicePlan[] = [
    // 1 Month Plans
    {
        id: '1m-unlimited',
        nameEN: '1 Month Unlimited',
        nameMM: '၁ လ အကန့်အသတ်မရှိ',
        price: 10000,
        currency: 'MMK',
        durationEN: '30 Days',
        durationMM: '၃၀ ရက်',
        type: 'ONE_MONTH',
        dataLimitEN: 'Unlimited Data',
        dataLimitMM: 'အကန့်အသတ်မဲ့ဒေတာ',
        descriptionEN: 'High-speed unlimited data, perfect for streaming, gaming, and heavy browsing. No data caps.',
        descriptionMM: 'မြန်နှုန်းမြင့် အကန့်အသတ်မရှိ ဒေတာ။ ဗီဒီယိုကြည့်ခြင်း၊ ဂိမ်းဆော့ခြင်းနှင့် အသုံးပြုမှုများသူများအတွက် အထူးသင့်လျော်သည်။ ဒေတာကန့်သတ်ချက်မရှိပါ။'
    },
    {
        id: '1m-100gb',
        nameEN: '1 Month Lite',
        nameMM: '၁ လ (100GB)',
        price: 5000,
        currency: 'MMK',
        durationEN: '30 Days',
        durationMM: '၃၀ ရက်',
        type: 'ONE_MONTH',
        dataLimitEN: '100 GB Data',
        dataLimitMM: '100 GB ဒေတာ',
        descriptionEN: 'Affordable 100GB high-speed data. Great for social media, news, and daily browsing.',
        descriptionMM: 'ဈေးနှုန်းသက်သာသော 100GB မြန်နှုန်းမြင့်ဒေတာ။ လူမှုကွန်ယက်အသုံးပြုခြင်း၊ သတင်းဖတ်ခြင်းနှင့် ပုံမှန်အသုံးပြုသူများအတွက် သင့်လျော်သည်။'
    },
    // 3 Month Plans
    {
        id: '3m-unlimited',
        nameEN: '3 Months Unlimited',
        nameMM: '၃ လ အကန့်အသတ်မရှိ',
        price: 27000,
        currency: 'MMK',
        durationEN: '90 Days',
        durationMM: '၉၀ ရက်',
        type: 'THREE_MONTHS',
        dataLimitEN: 'Unlimited Data',
        dataLimitMM: 'အကန့်အသတ်မဲ့ဒေတာ',
        descriptionEN: 'High-speed unlimited data, perfect for streaming, gaming, and heavy browsing. No data caps.',
        descriptionMM: 'မြန်နှုန်းမြင့် အကန့်အသတ်မရှိ ဒေတာ။ ဗီဒီယိုကြည့်ခြင်း၊ ဂိမ်းဆော့ခြင်းနှင့် အသုံးပြုမှုများသူများအတွက် အထူးသင့်လျော်သည်။ ဒေတာကန့်သတ်ချက်မရှိပါ။'
    },
    {
        id: '3m-300gb',
        nameEN: '3 Months Lite (300GB)',
        nameMM: '၃ လ (300GB)',
        price: 13500,
        currency: 'MMK',
        durationEN: '90 Days',
        durationMM: '၉၀ ရက်',
        type: 'THREE_MONTHS',
        dataLimitEN: '300 GB Data',
        dataLimitMM: '300 GB ဒေတာ',
        descriptionEN: 'Affordable 300GB high-speed data. Great for social media, news, and daily browsing.',
        descriptionMM: 'ဈေးနှုန်းသက်သာသော 300GB မြန်နှုန်းမြင့်ဒေတာ။ လူမှုကွန်ယက်အသုံးပြုခြင်း၊ သတင်းဖတ်ခြင်းနှင့် ပုံမှန်အသုံးပြုသူများအတွက် သင့်လျော်သည်။'
    },
    // 6 Month Plans
    {
        id: '6m-unlimited',
        nameEN: '6 Months Unlimited',
        nameMM: '၆ လ အကန့်အသတ်မရှိ',
        price: 50000,
        currency: 'MMK',
        durationEN: '180 Days',
        durationMM: '၁၈၀ ရက်',
        type: 'SIX_MONTHS',
        dataLimitEN: 'Unlimited Data',
        dataLimitMM: 'အကန့်အသတ်မဲ့ဒေတာ',
        descriptionEN: 'High-speed unlimited data, perfect for streaming, gaming, and heavy browsing. No data caps.',
        descriptionMM: 'မြန်နှုန်းမြင့် အကန့်အသတ်မရှိ ဒေတာ။ ဗီဒီယိုကြည့်ခြင်း၊ ဂိမ်းဆော့ခြင်းနှင့် အသုံးပြုမှုများသူများအတွက် အထူးသင့်လျော်သည်။ ဒေတာကန့်သတ်ချက်မရှိပါ။'
    },
    {
        id: '6m-600gb',
        nameEN: '6 Months Lite (600GB)',
        nameMM: '၆ လ (600GB)',
        price: 25000,
        currency: 'MMK',
        durationEN: '180 Days',
        durationMM: '၁၈၀ ရက်',
        type: 'SIX_MONTHS',
        dataLimitEN: '600 GB Data',
        dataLimitMM: '600 GB ဒေတာ',
        descriptionEN: 'Affordable 600GB high-speed data. Great for social media, news, and daily browsing.',
        descriptionMM: 'ဈေးနှုန်းသက်သာသော 600GB မြန်နှုန်းမြင့်ဒေတာ။ လူမှုကွန်ယက်အသုံးပြုခြင်း၊ သတင်းဖတ်ခြင်းနှင့် ပုံမှန်အသုံးပြုသူများအတွက် သင့်လျော်သည်။'
    }
];

export const PAYMENT_METHODS: PaymentMethod[] = [
    {
        id: 'kbz',
        name: 'KPay (KBZ Pay)',
        provider: 'KBZ Pay',
        accountName: 'Moe Kyaw Aung',
        accountNumber: '09766072220',
        emoji: '💙'
    },
    {
        id: 'wave',
        name: 'Wave Money',
        provider: 'Wave Money',
        accountName: 'Moe Kyaw Aung',
        accountNumber: '09766072220',
        emoji: '💛'
    },
    {
        id: 'aya',
        name: 'Aya Pay',
        provider: 'Aya Pay',
        accountName: 'Moe Kyaw Aung',
        accountNumber: '09766072220',
        emoji: '💚'
    }
];
