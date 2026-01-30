import { GoogleGenAI, Type, Schema } from "@google/genai";
import { config } from "./config.js";
import { getGeminiModel } from "./database.js";

export interface VerificationResult {
  isValid: boolean;
  detectedAmount: number;
  transactionId?: string;
  reason: string;
  confidence: number;
  fraudIndicators?: string[];
  detectedPaymentApp?: string;
}

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

const verificationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    isValid: {
      type: Type.BOOLEAN,
      description: "Whether the payment is valid. Must be FALSE if ANY fraud indicators are detected."
    },
    detectedAmount: {
      type: Type.NUMBER,
      description: "The numeric amount found on the slip in MMK."
    },
    transactionId: {
      type: Type.STRING,
      description: "The unique transaction ID extracted from the receipt."
    },
    detectedPaymentApp: {
      type: Type.STRING,
      description: "The payment app detected in the screenshot: 'KBZPay', 'Wave', 'AyaPay', or 'Unknown'"
    },
    reason: {
      type: Type.STRING,
      description: "Detailed explanation of why it passed or failed verification."
    },
    confidence: {
      type: Type.NUMBER,
      description: "Confidence score between 0 and 1. Must be below 0.5 if any doubts exist."
    },
    fraudIndicators: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of any suspicious elements detected"
    }
  },
  required: ["isValid", "detectedAmount", "reason", "confidence", "detectedPaymentApp"]
};

const GEMINI_SYSTEM_INSTRUCTION = `
You are an expert fraud detection specialist for Myanmar mobile payment screenshots.
Your job is to detect FAKE, EDITED, or FRAUDULENT payment receipts.
Be EXTREMELY STRICT - it is better to reject a valid payment than accept a fraudulent one.
ALWAYS verify that the payment app matches what the user selected.
Only output valid JSON as requested.
`;

export async function verifyPaymentSlipOnServer(
  base64Image: string,
  expectedAmount: number,
  mimeType: string = "image/jpeg",
  expectedPaymentMethod?: string,
  currentDateTime?: string,
  originalAmount?: number,
  discountApplied?: number
): Promise<VerificationResult> {
  if (!config.geminiApiKey) {
    return {
      isValid: false,
      detectedAmount: 0,
      reason: "Verification service not configured (Missing API Key).",
      confidence: 0
    };
  }

  // Current time for date validation
  const now = currentDateTime || new Date().toISOString();
  const expectedApp = expectedPaymentMethod || "any";

  const discountContext = originalAmount && discountApplied
    ? `\n=== DISCOUNT APPLIED ===\nThis user used a promo code. \n- Original Price: ${originalAmount.toLocaleString()} MMK\n- Discount: ${discountApplied}% OFF\n- FINAL EXPECTED AMOUNT: ${expectedAmount.toLocaleString()} MMK\nYou should expect to see ${expectedAmount.toLocaleString()} MMK on the receipt because a promotion was applied.`
    : "";

  try {
    const modelId = getGeminiModel();
    const prompt = `
FRAUD DETECTION TASK - Analyze this Myanmar mobile payment screenshot.
Expected Payment: ${expectedAmount.toLocaleString()} MMK
Expected Payment App: ${expectedApp}${discountContext}

=== CRITICAL: NO DATE/TIME CHECK ===
- YOU DO NOT KNOW THE CURRENT DATE.
- DO NOT VERIFY, CHECK, OR EVEN LOOK AT THE DATE OR TIME ON THE RECEIPT.
- NEVER flag 'Future Date', 'Old Date', or any date-related issue.
- The date and time are IRRELEVANT and MUST BE IGNORED COMPLETELY.

=== PAYMENT APP MATCHING ===
User selected: ${expectedApp}
- KBZPay/KPay: Blue theme, KBZ branding
- Wave Money: Yellow/orange theme, Wave logo
- Aya Pay: Red theme, Aya branding

If the screenshot is from a DIFFERENT app, REJECT IT.

=== RECIPIENT CHECK (STRICT) ===
You must verify the recipient details EXACTLY:
1. Name: Must be "Moe Kyaw Aung"
2. Phone: Must end with '2220' (e.g., *******2220 or 09766072220)

REJECT IMMEDIATELY if the name is different or the phone number does not end in 2220.

=== AMOUNT CHECK ===
- Amount MUST be >= ${expectedAmount.toLocaleString()} MMK.
- Ignore negative signs (e.g., -10000 is valid).

=== KEYWORD RESTRICTIONS ===
- REJECT if "Note" or "Description" contains "VPN".

=== FRAUD DETECTION ===
- REJECT if font styles are inconsistent.
- REJECT if the interface looks like a fake generator.

=== FINAL DECISION ===
Set isValid=TRUE only if:
1. App matches
2. Recipient Name matches "Moe Kyaw Aung"
3. Recipient Phone ends with "2220"
4. Amount is correct
5. NO "VPN" in notes
6. Status is SUCCESS
7. Transaction ID is visible
`;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image
            }
          },
          { text: prompt }
        ]
      },
      config: {
        systemInstruction: GEMINI_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: verificationSchema,
        temperature: 0.1
      }
    });

    let jsonText = response.text;
    if (!jsonText) {
      throw new Error("Empty response from Gemini");
    }

    // Clean markdown code blocks if present
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```json\s*/, "").replace(/```$/, "").trim();
    }

    const result = JSON.parse(jsonText) as VerificationResult;

    // STRICT: Verify payment app matches
    if (expectedPaymentMethod && result.detectedPaymentApp) {
      const expectedNorm = expectedPaymentMethod.toLowerCase().replace(/\s+/g, '');
      const detectedNorm = result.detectedPaymentApp.toLowerCase().replace(/\s+/g, '');

      const isKBZ = expectedNorm.includes('kbz') || expectedNorm.includes('kpay');
      const isWave = expectedNorm.includes('wave');
      const isAya = expectedNorm.includes('aya');

      const detectedKBZ = detectedNorm.includes('kbz') || detectedNorm.includes('kpay');
      const detectedWave = detectedNorm.includes('wave');
      const detectedAya = detectedNorm.includes('aya');

      if ((isKBZ && !detectedKBZ) || (isWave && !detectedWave) || (isAya && !detectedAya)) {
        result.isValid = false;
        result.reason = `Payment app mismatch! You selected ${expectedPaymentMethod} but uploaded a ${result.detectedPaymentApp} screenshot.`;
        result.fraudIndicators = result.fraudIndicators || [];
        result.fraudIndicators.push("Payment app does not match selection");
      }
    }

    // Extra validation: reject low confidence
    if (result.confidence < 0.7 && result.isValid) {
      result.isValid = false;
      result.reason = `Low confidence (${(result.confidence * 100).toFixed(0)}%) - manual review needed. ${result.reason}`;
    }

    // Extra validation: reject if no transaction ID
    if (result.isValid && !result.transactionId) {
      result.isValid = false;
      result.reason = "No transaction ID found - cannot verify payment uniqueness.";
    }

    // Log fraud indicators if any
    if (result.fraudIndicators && result.fraudIndicators.length > 0) {
      console.log("⚠️ Fraud indicators detected:", result.fraudIndicators);
    }

    console.log("Verification result:", {
      isValid: result.isValid,
      amount: result.detectedAmount,
      txId: result.transactionId,
      confidence: result.confidence,
      expectedApp: expectedPaymentMethod,
      detectedApp: result.detectedPaymentApp,
      fraudIndicators: result.fraudIndicators
    });

    return result;

  } catch (error: any) {
    console.error("Verification Error:", error);

    let reason = "Unknown error";
    if (error.message) {
      reason = error.message;
      // Try to parse if it's a JSON string (common with Google GenAI)
      if (reason.startsWith('{') || reason.includes('{"error":')) {
        try {
          // Sometimes error.message is just the JSON, sometimes it has text around it
          const jsonMatch = reason.match(/{.*}/s);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.error && parsed.error.message) {
              reason = parsed.error.message;
            }
          }
        } catch (e) {
          // ignore parsing error
        }
      }
    }

    return {
      isValid: false,
      detectedAmount: 0,
      reason: `Verification failed: ${reason}`,
      confidence: 0
    };
  }
}