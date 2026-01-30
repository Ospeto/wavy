import { httpJson, HttpError } from "./httpClient.js";
import { config } from "./config.js";
import crypto from 'node:crypto';

export type PlanType = "ONE_MONTH" | "THREE_MONTHS" | "SIX_MONTHS";

export interface ServicePlan {
  id: string;
  name: string;
  type: PlanType;
  dataLimit: string;
}

export interface AccessKey {
  key: string;
  protocol: string;
  expiryDate: string;
}

const BYTES_PER_GB = 1073741824;

function calculateExpiration(type: PlanType): string {
  const date = new Date();
  switch (type) {
    case "ONE_MONTH":
      date.setDate(date.getDate() + 30);
      break;
    case "THREE_MONTHS":
      date.setDate(date.getDate() + 90);
      break;
    case "SIX_MONTHS":
      date.setDate(date.getDate() + 180);
      break;
    default:
      date.setDate(date.getDate() + 30);
  }
  return date.toISOString();
}

function calculateTrafficLimit(dataLimitString: string): number {
  if (dataLimitString.toLowerCase().includes("unlimited")) {
    return 0;
  }
  const match = dataLimitString.match(/(\d+)\s*GB/i);
  if (match && match[1]) {
    return parseInt(match[1], 10) * BYTES_PER_GB;
  }
  return 0;
}

function buildUsername(transactionId?: string, telegramUsername?: string): { username: string; rawTxId: string } {
  const uniqueSuffix = crypto.randomBytes(2).toString('hex'); // 4 chars
  const rawTxId = (transactionId || Date.now().toString()).replace(/[^a-zA-Z0-9]/g, "");

  let baseName = "wavy";
  if (telegramUsername) {
    // Clean telegram username: remove @, keep alphanumeric and underscores
    baseName = telegramUsername.replace(/^@/, "").replace(/[^a-zA-Z0-9_]/g, "");
    // Truncate if too long to leave room for suffix
    if (baseName.length > 20) baseName = baseName.substring(0, 20);
  }

  // Use last 4 digits of transactionId for context without being messy
  const shortTx = rawTxId.substring(Math.max(0, rawTxId.length - 4));

  // Final format: username_4tx_4suffix (e.g., ospeto_8175_a1b2)
  const username = `${baseName}_${shortTx}_${uniqueSuffix}`;

  return { username, rawTxId };
}

interface RemnawaveCreateUserPayload {
  username: string;
  status: "ACTIVE" | "DISABLED";
  trafficLimitBytes: number;
  trafficLimitStrategy: "NO_RESET";
  expireAt: string;
  description: string;
  activeInternalSquads: string[];
}

interface RemnawaveUserResponse {
  response?: {
    subscriptionUrl?: string;
    id?: string;
    uuid?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export async function createAccessKeyOnRemnawave(
  plan: ServicePlan,
  transactionId?: string,
  telegramId?: number,
  telegramUsername?: string
): Promise<AccessKey> {
  const apiUrl = config.remnawaveApiUrl.replace(/\/+$/, "");
  const apiKey = config.remnawaveApiKey;

  if (!apiUrl || !apiKey) {
    throw new Error("Remnawave configuration error on server.");
  }

  const { username, rawTxId } = buildUsername(transactionId, telegramUsername);
  const expireAt = calculateExpiration(plan.type);

  // VIP squad UUID
  const VIP_SQUAD_UUID = "87dfe20c-e812-4c43-b424-2f5bb6458329";

  // Minimal payload with only required fields
  const payload = {
    username,
    status: "ACTIVE",
    trafficLimitBytes: calculateTrafficLimit(plan.dataLimit),
    trafficLimitStrategy: "NO_RESET",
    expireAt,
    description: `Wavy: ${plan.name} | TG: ${telegramId || 'N/A'} | Tx: ${rawTxId}`,
    activeInternalSquads: [VIP_SQUAD_UUID]
  };

  const endpoint = `${apiUrl}/api/users`;
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log("Creating Remnawave user:", { username, plan: plan.name, squad: "VIP", attempt });
      console.log("Payload:", JSON.stringify(payload, null, 2));

      const data = await httpJson<RemnawaveUserResponse>(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      });

      const userResponse = data.response;

      if (!userResponse || !userResponse.subscriptionUrl) {
        console.error("Malformed Remnawave response:", data);
        throw new Error("Server returned success but no subscription key was found.");
      }

      console.log("Remnawave user created successfully:", {
        username,
        subscriptionUrl: userResponse.subscriptionUrl.substring(0, 50) + "..."
      });

      return {
        key: userResponse.subscriptionUrl,
        protocol: "Subscription URL",
        expiryDate: new Date(expireAt).toISOString().slice(0, 10)
      };

    } catch (error: any) {
      lastError = error;
      console.error(`Attempt ${attempt}/${maxRetries} failed for Remnawave user creation:`, error instanceof HttpError ? `HTTP ${error.status}` : error.message);

      // Determine if the error is retryable
      let isRetryable = true;
      if (error instanceof HttpError) {
        // Client errors (4xx) are generally not retryable, except for specific cases if known.
        // Here, 409 (conflict), 401/403 (auth), 400 (bad request) are considered non-retryable.
        if (error.status === 409) {
          throw new Error("Duplicate user or transaction detected on Remnawave.");
        }
        if (error.status === 401 || error.status === 403) {
          throw new Error("Remnawave authentication error. Check server API key.");
        }
        if (error.status === 400) {
          const details = error.details as any;
          const msg = details?.errors?.[0]?.message || details?.message || "Invalid request";
          throw new Error(`Remnawave: ${msg}`);
        }
        // Server errors (5xx) or connection errors (null status) are retryable
        if (error.status && error.status < 500) {
          isRetryable = false; // Non-retryable client error
        }
      }

      if (isRetryable && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // If not retryable or last attempt, re-throw the specific error
        if (error instanceof HttpError) {
          if (error.status && error.status >= 500) {
            throw new Error("Remnawave server error. Please try again later.");
          }
          if (error.status === null) {
            throw new Error("Cannot connect to Remnawave server.");
          }
          throw new Error(error.message || "Failed to create user on Remnawave.");
        }
        console.error("Unexpected Remnawave error:", error);
        throw new Error("Unexpected error while creating Remnawave access key.");
      }
    }
  }

  // If the loop finishes, it means all retries failed and the last error was not re-thrown immediately.
  // This should ideally not be reached if errors are always thrown, but as a fallback:
  if (lastError) {
    throw lastError;
  }
  throw new Error("Failed to create Remnawave access key after multiple retries.");
}

// --- Fetch All Users for Revenue Reports ---
export interface RemnawaveUser {
  uuid: string;
  username: string;
  status: string;
  trafficLimitBytes: number;
  usedTrafficBytes: number;
  createdAt: string;
  expireAt: string;
  description?: string;
}

interface RemnawaveUsersResponse {
  response: {
    total: number;
    users: RemnawaveUser[];
  };
}

export async function getAllRemnawaveUsers(): Promise<RemnawaveUser[]> {
  const apiUrl = config.remnawaveApiUrl.replace(/\/+$/, "");
  const apiKey = config.remnawaveApiKey;
  const pageSize = 25; // API's default/fixed limit

  try {
    // 1. Fetch first page to get metadata
    console.log(`[Pagination] Fetching initial page...`);
    const firstPageData = await httpJson<RemnawaveUsersResponse>(`${apiUrl}/api/users?skip=0`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json"
      }
    });

    if (!firstPageData.response?.users) {
      throw new Error("Invalid response from Remnawave API");
    }

    let allUsers = [...firstPageData.response.users];
    const totalUsers = firstPageData.response.total || 0;

    console.log(`[Pagination] Initial fetch: ${allUsers.length}/${totalUsers} users`);

    if (allUsers.length >= totalUsers || allUsers.length === 0) {
      return allUsers;
    }

    // 2. Calculate remaining pages
    const remainingOffsets: number[] = [];
    for (let skip = pageSize; skip < totalUsers; skip += pageSize) {
      remainingOffsets.push(skip);
    }

    // 3. Parallel fetch with concurrency limit
    const CONCURRENCY = 5;
    const errors: any[] = [];

    // Helper to fetch a single page
    const fetchPage = async (skip: number) => {
      try {
        const data = await httpJson<RemnawaveUsersResponse>(`${apiUrl}/api/users?skip=${skip}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json"
          }
        });
        if (data.response?.users) {
          return data.response.users;
        }
        return [];
      } catch (err) {
        console.error(`[Pagination] Error fetching skip=${skip}:`, err);
        errors.push(err);
        return [];
      }
    };

    // Process in chunks
    for (let i = 0; i < remainingOffsets.length; i += CONCURRENCY) {
      const chunk = remainingOffsets.slice(i, i + CONCURRENCY);
      console.log(`[Pagination] Fetching chunk ${i / CONCURRENCY + 1} (offsets ${chunk.join(', ')})...`);

      const results = await Promise.all(chunk.map(skip => fetchPage(skip)));
      results.forEach(users => allUsers = allUsers.concat(users));
    }

    console.log(`[Pagination] COMPLETE: Fetched ${allUsers.length}/${totalUsers} users.`);
    if (errors.length > 0) {
      console.warn(`[Pagination] Completed with ${errors.length} errors.`);
    }

    return allUsers;

  } catch (error: any) {
    console.error("[Pagination] Critical Error:", error);
    return [];
  }
}