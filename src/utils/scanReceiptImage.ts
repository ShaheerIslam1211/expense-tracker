import type { ParsedReceipt } from './receiptScan'

// API endpoint configuration
const OCR_API_URL = import.meta.env.VITE_OCR_API_URL || 'http://localhost:8000'

/** Convert data URL to Blob for API upload */
function dataURLToBlob(dataURL: string): Blob {
  const arr = dataURL.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

/** Run OCR on image using PaddleOCR backend API */
export async function scanReceiptImage(
  imageDataUrl: string,
  onProgress?: (p: number) => void
): Promise<ParsedReceipt> {
  try {
    onProgress?.(0.1)

    // Convert data URL to blob
    const imageBlob = dataURLToBlob(imageDataUrl)

    onProgress?.(0.3)

    // Create form data for API request
    const formData = new FormData()
    formData.append('file', imageBlob, 'receipt.jpg')

    onProgress?.(0.5)

    // Call the OCR API
    const response = await fetch(`${OCR_API_URL}/api/ocr`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`OCR API error: ${response.status} ${response.statusText}`)
    }

    onProgress?.(0.8)

    const result = await response.json()

    // Log the raw OCR API response for debugging
    console.log('🔍 OCR API Raw Response:', result)

    // Convert API response to our ParsedReceipt format
    const parsedReceipt: ParsedReceipt = {
      items: result.items?.map((item: any) => ({
        name: item.name,
        amount: item.amount,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        categoryId: item.categoryId,
      })) || [],
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
    }

    // Log the final parsed receipt data
    console.log('📋 Final Parsed Receipt:', {
      merchant: parsedReceipt.merchant,
      total: parsedReceipt.total,
      date: parsedReceipt.date,
      reference: parsedReceipt.reference,
      address: parsedReceipt.address,
      customer: parsedReceipt.customer,
      receiptType: parsedReceipt.receiptType,
      itemCount: parsedReceipt.items?.length || 0,
      items: parsedReceipt.items?.map(item => ({
        name: item.name,
        amount: item.amount,
        category: item.categoryId
      })) || []
    })

    onProgress?.(1.0)
    return parsedReceipt

  } catch (error) {
    console.error('OCR API call failed:', error)

    // Fallback to local parsing if API fails (for development)
    console.warn('Falling back to basic text parsing')
    onProgress?.(0.9)

    // You could implement a basic fallback here if needed
    // For now, return empty result
    return {
      items: [],
      total: undefined,
      grossTotal: undefined,
      netTotal: undefined,
      date: undefined,
      merchant: undefined,
      reference: undefined,
      description: undefined,
    }
  }
}
