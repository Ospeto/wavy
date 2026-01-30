import fetch, { RequestInit, Response } from "node-fetch";

export class HttpError extends Error {
  status: number | null;
  url: string;
  details?: unknown;

  constructor(message: string, options: { status?: number | null; url: string; details?: unknown }) {
    super(message);
    this.name = "HttpError";
    this.status = options.status ?? null;
    this.url = options.url;
    this.details = options.details;
  }
}

const DEFAULT_TIMEOUT_MS = 15000;

export async function httpJson<TResponse>(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<TResponse> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response: Response = await fetch(url, {
      ...fetchOptions,
      // @ts-ignore: node-fetch signals are compatible but types might conflict
      signal: controller.signal
    });

    const contentType = response.headers.get("content-type") ?? "";
    const status = response.status;
    let rawBody: string | null = null;
    let jsonBody: unknown = null;

    try {
      rawBody = await response.text();
      if (rawBody && contentType.includes("application/json")) {
        jsonBody = JSON.parse(rawBody);
      }
    } catch {
      // ignore parse error, use rawBody as details
    }

    if (!response.ok) {
      let message = `Request failed with status ${status}`;

      if (jsonBody && typeof jsonBody === "object") {
        const body = jsonBody as any;
        if (typeof body.message === "string") {
          message = body.message;
        } else if (Array.isArray(body.errors)) {
          message = body.errors.join(", ");
        } else if (body.detail) {
          message = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
        }
      }

      throw new HttpError(message, { status, url, details: jsonBody ?? rawBody ?? undefined });
    }

    if (!rawBody) {
      // 204 No Content, etc.
      return undefined as unknown as TResponse;
    }

    if (jsonBody !== null) {
      return jsonBody as TResponse;
    }

    throw new HttpError("Unexpected non-JSON response from server", {
      status,
      url,
      details: rawBody
    });

  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      throw new HttpError("Request timed out", { status: null, url });
    }

    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(error?.message ?? "Network error occurred", {
      status: null,
      url
    });

  } finally {
    clearTimeout(timeoutId);
  }
}