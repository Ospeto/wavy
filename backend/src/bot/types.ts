import { Context, SessionFlavor } from "grammy";

/**
 * Session data stored for each user conversation.
 * This is the single source of truth for session shape.
 */
export interface SessionData {
    selectedPlanId?: string;
    expectedAmount?: number;
    awaitingPaymentProof?: boolean;
    paymentMethod?: string;
    lastUploadTime?: number;
    uploadCount?: number;
    promoCode?: string;
    discountApplied?: number;
    awaitingPromoCode?: boolean;
    language?: 'en' | 'mm';
}

/**
 * Bot context with session flavor.
 * Use this type for all handler functions.
 */
export type BotContext = Context & SessionFlavor<SessionData>;

/**
 * Supported languages.
 */
export type Language = 'en' | 'mm';
