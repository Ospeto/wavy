import { GoogleGenAI, Type, Schema } from "@google/genai";
import { config } from "./config.js";

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
    const modelId = "gemini-3-flash-preview";
    const prompt = `
FRAUD DETECTION TASK - Analyze this Myanmar mobile payment screenshot.
Expected Payment: ${expectedAmount.toLocaleString()} MMK
Expected Payment App: ${expectedApp}${discountContext}

=== CRITICAL: NO DATE/TIME CHECK ===
- YOU DO NOT KNOW THE CURRENT DATE.
- DO NOT VERIFY, CHECK, OR EVEN LOOK AT THE DATE OR TIME ON THE RECEIPT.
- NEVER flag 'Future Date', 'Old Date', or any date-related issue.
- The date and time are IRRELEVANT and MUST BE IGNORED COMPLETELY.

=== CRITICAL: PAYMENT APP MATCHING ===
User selected: ${expectedApp}
You MUST detect which app the screenshot is from:
- KBZPay/KPay: Blue theme, KBZ branding, "KBZ" logo
- Wave Money: Yellow/orange theme, Wave logo
- Aya Pay: Red theme, Aya branding

If the screenshot is from a DIFFERENT app than selected, REJECT IT IMMEDIATELY.
Example: If user selected "Wave Money" but screenshot shows KBZPay blue interface, REJECT.

=== MANDATORY RECIPIENT INFO ===
The payment MUST be sent to the following recipient:
- Name: Moe Kyaw Aung
- Phone: Must end with '2220' (e.g., *******2220 or 09766072220)
REJECT the payment if the recipient name does not match exactly or the phone number doesn't end in 2220.

=== KEYWORD RESTRICTIONS ===
- REJECT the payment if the "Note", "Description", or "Reference" field contains the word "VPN".
- This is a CRITICAL rule. If you see "VPN" anywhere in the text fields related to user input, set isValid=FALSE.

=== FRAUD DETECTION (STILL REQUIRED) ===
- REJECT if font styles are inconsistent (look for digital editing).
- REJECT if there is pixelation or artifacts around numbers (ignore pixelation around dates).
- REJECT if the interface looks like a digital mockup rather than a real app.
- REJECT if the app colors/theme do not match (e.g., KBZPay blue vs Aya red).

=== IMAGE AUTHENTICITY CHECKS ===
Check for signs of photo manipulation:
- Inconsistent fonts, pixelation around numbers, misaligned text.
- Text that looks digitally inserted or "too clean".
- Screenshot of a screenshot or cropped edges.

=== PAYMENT STATUS & AMOUNT ===
- Status MUST be SUCCESS (checkmark, "Success", "ငွေလွှဲပြီးပါပြီ").
- Amount MUST be EXACTLY ${expectedAmount.toLocaleString()} MMK or more.
- IMPORTANT: The amount may appear with a NEGATIVE sign (e.g., -${expectedAmount.toLocaleString()} Ks) because it is a debit from the sender's account. This is NORMAL and SHOULD BE ACCEPTED as long as the absolute value matches.

=== TRANSACTION ID ===
- Extraction is MANDATORY. Reject if no transaction ID is found.

=== FINAL DECISION ===
Set isValid=TRUE only if:
1. Payment app matches ${expectedApp}
2. Recipient matches Moe Kyaw Aung and phone ends in 2220
3. No signs of editing or fraud
4. Status is SUCCESS and Amount is correct
5. Transaction ID is extracted
6. THE NOTE/DESCRIPTION DOES NOT CONTAIN THE WORD "VPN"
7. Confidence >= 0.8

IMPORTANT: 
- NEVER INCLUDE DATE OR TIME ISSUES IN 'fraudIndicators' OR 'reason'.
- RECIPIENT NAME MUST MATCH EXACTLY.
- RECIPIENT PHONE MUST END IN 2220.
- REJECT IMMEDIATELY IF "VPN" IS IN THE NOTE.
- Set detectedPaymentApp to: "KBZPay", "Wave", "AyaPay", or "Unknown".
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
    return {
      isValid: false,
      detectedAmount: 0,
      reason: `Verification failed: ${error.message || "Unknown error"}`,
      confidence: 0
    };
  }
}