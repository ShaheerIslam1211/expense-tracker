import type { CategoryId } from "../types";
import type { ParsedReceipt } from "./receiptScan";

const OCR_API_URL = import.meta.env.VITE_OCR_API_URL || "http://localhost:8000";

interface OcrApiItem {
  name?: string;
  amount?: number;
  quantity?: number;
  unitPrice?: number;
  categoryId?: string;
}

interface OcrApiResponse {
  items?: OcrApiItem[];
  total?: number;
  grossTotal?: number;
  netTotal?: number;
  date?: string;
  merchant?: string;
  reference?: string;
  address?: string;
  customer?: string;
  receiptType?: ParsedReceipt["receiptType"];
  description?: string;
}

function assertProductionOcrUrl(url: string) {
  if (!import.meta.env.PROD) return;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:") return;
    const host = parsed.hostname;
    if (host === "localhost" || host === "127.0.0.1") return;
  } catch {
    throw new Error("Invalid VITE_OCR_API_URL");
  }
  throw new Error(
    "Receipt OCR must use HTTPS in production. Set VITE_OCR_API_URL to an https:// URL for your OCR backend.",
  );
}

/** Convert data URL to Blob for API upload */
function dataURLToBlob(dataURL: string): Blob {
  const arr = dataURL.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/** Run OCR on image using PaddleOCR backend API */
export async function scanReceiptImage(
  imageDataUrl: string,
  onProgress?: (p: number) => void,
): Promise<ParsedReceipt> {
  try {
    assertProductionOcrUrl(OCR_API_URL);
    onProgress?.(0.1);

    const imageBlob = dataURLToBlob(imageDataUrl);
    onProgress?.(0.3);

    const formData = new FormData();
    formData.append("file", imageBlob, "receipt.jpg");
    onProgress?.(0.5);

    const response = await fetch(`${OCR_API_URL.replace(/\/$/, "")}/api/ocr`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`OCR API error: ${response.status} ${response.statusText}`);
    }

    onProgress?.(0.8);

    const result = (await response.json()) as OcrApiResponse;

    if (import.meta.env.DEV) {
      console.log("OCR API response:", result);
    }

    const parsedReceipt: ParsedReceipt = {
      items:
        result.items?.map((item) => ({
          name: item.name ?? "",
          amount: typeof item.amount === "number" ? item.amount : 0,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          categoryId: item.categoryId as CategoryId | undefined,
        })) ?? [],
      total: result.total,
      grossTotal: result.grossTotal,
      netTotal: result.netTotal,
      date: result.date,
      merchant: result.merchant,
      reference: result.reference,
      address: result.address,
      customer: result.customer,
      receiptType: result.receiptType,
      description: result.description,
    };

    onProgress?.(1.0);
    return parsedReceipt;
  } catch (error) {
    console.error("OCR API call failed:", error);
    onProgress?.(0.9);

    return {
      items: [],
      total: undefined,
      grossTotal: undefined,
      netTotal: undefined,
      date: undefined,
      merchant: undefined,
      reference: undefined,
      description: undefined,
    };
  }
}
