import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use data directory for persistence
const dbPath = process.env.DB_PATH || path.resolve(__dirname, '../data/transactions.json');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

export interface TransactionRecord {
    id: number;
    telegram_user_id: string;
    telegram_username?: string;
    transaction_id?: string;
    plan_id: string;
    plan_name: string;
    amount: number;
    payment_method?: string;
    subscription_key?: string;
    status: 'pending' | 'verified' | 'failed' | 'completed';
    created_at: string;
    verified_at?: string;
    error_message?: string;
}

export interface User {
    telegram_id: string;
    username?: string;
    is_premium: boolean;
    created_at: string;
}

export interface PromoCode {
    code: string;
    discount_percentage: number;
    usage_limit: number;
    usage_count: number;
    expires_at: string;
    applicable_plan_ids?: string[];
}

interface Database {
    transactions: TransactionRecord[];
    users: User[];
    promocodes: PromoCode[];
    nextId: number;
}

// In-memory cache for performance
let dbCache: Database | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5000; // 5 seconds

// Debounce save to reduce disk I/O
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const SAVE_DELAY_MS = 100;

function loadDb(): Database {
    // Check cache first
    const now = Date.now();
    if (dbCache && (now - cacheTimestamp) < CACHE_TTL_MS) {
        return dbCache;
    }

    try {
        if (fs.existsSync(dbPath)) {
            const data = fs.readFileSync(dbPath, 'utf-8');
            const db: Database = JSON.parse(data);

            // Ensure all required fields exist (Schema protection)
            if (!db.transactions) db.transactions = [];
            if (!db.users) db.users = [];
            if (!db.promocodes) db.promocodes = [];
            if (!db.nextId) db.nextId = db.transactions.length > 0 ? Math.max(...db.transactions.map(t => t.id)) + 1 : 1;

            dbCache = db;
            cacheTimestamp = now;
            return db;
        }
    } catch (error) {
        console.error('Error loading database:', error);
    }
    const freshDb = {
        transactions: [],
        users: [],
        promocodes: [],
        nextId: 1
    };
    dbCache = freshDb;
    cacheTimestamp = now;
    return freshDb;
}

function saveDb(db: Database): void {
    // Update cache immediately
    dbCache = db;
    cacheTimestamp = Date.now();

    // Debounce the actual disk write
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(() => {
        try {
            fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
        } catch (error) {
            console.error('Error saving database:', error);
        }
        saveTimeout = null;
    }, SAVE_DELAY_MS);
}

// Check if transaction ID already exists
export function isTransactionUsed(transactionId: string): boolean {
    const db = loadDb();
    return db.transactions.some(t => t.transaction_id === transactionId && t.status === 'completed');
}

// Create a new pending transaction
export function createTransaction(record: Omit<TransactionRecord, 'id' | 'created_at'>): number {
    const db = loadDb();
    const id = db.nextId++;

    const newRecord: TransactionRecord = {
        ...record,
        id,
        created_at: new Date().toISOString()
    };

    db.transactions.push(newRecord);
    saveDb(db);

    return id;
}

// Update transaction with verification result
export function updateTransactionVerified(id: number, transactionId: string, subscriptionKey: string): void {
    const db = loadDb();
    const tx = db.transactions.find(t => t.id === id);
    if (tx) {
        tx.transaction_id = transactionId;
        tx.subscription_key = subscriptionKey;
        tx.status = 'completed';
        tx.verified_at = new Date().toISOString();
        saveDb(db);
    }
}

// Mark transaction as failed
export function updateTransactionFailed(id: number, errorMessage: string): void {
    const db = loadDb();
    const tx = db.transactions.find(t => t.id === id);
    if (tx) {
        tx.status = 'failed';
        tx.error_message = errorMessage;
        saveDb(db);
    }
}

// Get transaction by ID
export function getTransaction(id: number): TransactionRecord | undefined {
    const db = loadDb();
    return db.transactions.find(t => t.id === id);
}

// Get all transactions for a user
export function getUserTransactions(telegramUserId: string): TransactionRecord[] {
    const db = loadDb();
    return db.transactions
        .filter(t => t.telegram_user_id === telegramUserId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

// Get recent transactions (for admin)
export function getRecentTransactions(limit: number = 50): TransactionRecord[] {
    const db = loadDb();
    return db.transactions
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit);
}

// --- User Management ---
export function upsertUser(telegramId: string, username?: string): void {
    const db = loadDb();
    let user = db.users.find(u => u.telegram_id === telegramId);

    if (user) {
        user.username = username;
    } else {
        user = {
            telegram_id: telegramId,
            username,
            is_premium: false,
            created_at: new Date().toISOString()
        };
        db.users.push(user);
    }
    saveDb(db);
}

// --- Promo Code Management ---
export function getPromoCode(code: string): PromoCode | undefined {
    const db = loadDb();
    const normalizedCode = code.toUpperCase().trim();
    return db.promocodes.find(p => p.code === normalizedCode);
}

export function incrementPromoCodeUsage(code: string): void {
    const db = loadDb();
    const p = db.promocodes.find(pc => pc.code === code.toUpperCase().trim());
    if (p) {
        p.usage_count++;
        saveDb(db);
    }
}

export function addPromoCode(code: string, discount: number, limit: number, expiresAt: string, applicablePlanIds?: string[]): void {
    const db = loadDb();
    const normalizedCode = code.toUpperCase().trim();

    // Remove if exists to overwrite or prevent duplicates
    db.promocodes = db.promocodes.filter(p => p.code !== normalizedCode);

    db.promocodes.push({
        code: normalizedCode,
        discount_percentage: discount,
        usage_limit: limit,
        usage_count: 0,
        expires_at: expiresAt,
        applicable_plan_ids: applicablePlanIds
    });
    saveDb(db);
}

// --- Transaction Stats ---
export function getTransactionStats(): { total: number; completed: number; failed: number; pending: number } {
    const db = loadDb();
    return {
        total: db.transactions.length,
        completed: db.transactions.filter(t => t.status === 'completed').length,
        failed: db.transactions.filter(t => t.status === 'failed').length,
        pending: db.transactions.filter(t => t.status === 'pending').length
    };
}

console.log('📊 Database initialized at:', dbPath);
