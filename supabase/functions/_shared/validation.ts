// Server-side validation schemas for edge functions
// These must be independent from client-side code

export interface PaymentRequest {
  phone: string;
  amount: number;
  orderId: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validates Kenyan phone number format (M-Pesa compatible)
 */
export function validatePhoneNumber(phone: string): ValidationError | null {
  const phoneRegex = /^254[17]\d{8}$/;
  if (!phone || typeof phone !== 'string') {
    return { field: 'phone', message: 'Phone number is required' };
  }
  if (!phoneRegex.test(phone)) {
    return { field: 'phone', message: 'Invalid M-Pesa phone number. Use format: 254XXXXXXXXX' };
  }
  return null;
}

/**
 * Validates payment amount
 */
export function validateAmount(amount: number): ValidationError | null {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return { field: 'amount', message: 'Amount must be a valid number' };
  }
  if (amount < 1) {
    return { field: 'amount', message: 'Amount must be at least 1 KES' };
  }
  if (amount > 1000000) {
    return { field: 'amount', message: 'Amount cannot exceed 1,000,000 KES' };
  }
  return null;
}

/**
 * Validates UUID format
 */
export function validateUUID(id: string, fieldName: string): ValidationError | null {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!id || typeof id !== 'string') {
    return { field: fieldName, message: `${fieldName} is required` };
  }
  if (!uuidRegex.test(id)) {
    return { field: fieldName, message: `Invalid ${fieldName} format` };
  }
  return null;
}

/**
 * Validates payment request and returns errors array
 */
export function validatePaymentRequestErrors(request: PaymentRequest): ValidationError[] {
  const errors: ValidationError[] = [];
  
  const phoneError = validatePhoneNumber(request.phone);
  if (phoneError) errors.push(phoneError);
  
  const amountError = validateAmount(request.amount);
  if (amountError) errors.push(amountError);
  
  const orderIdError = validateUUID(request.orderId, 'orderId');
  if (orderIdError) errors.push(orderIdError);
  
  return errors;
}

/**
 * Formats phone number to M-Pesa compatible format
 * Converts 07XXXXXXXX or 01XXXXXXXX to 254XXXXXXXXX
 */
export function formatPhoneToMpesa(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '').replace(/[^\d]/g, '');
  
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return '254' + cleaned.substring(1);
  }
  
  if (cleaned.startsWith('254') && cleaned.length === 12) {
    return cleaned;
  }
  
  throw new Error('Invalid phone number format');
}

/**
 * Sanitizes string input to prevent injection
 */
export function sanitizeString(input: string, maxLength: number = 500): string {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, ''); // Basic XSS prevention
}

/**
 * Validates and returns payment request or throws error
 */
export function validatePaymentRequest(data: unknown): PaymentRequest {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid request body');
  }

  const { phone, amount, orderId } = data as Record<string, unknown>;

  if (typeof phone !== 'string' || !phone) {
    throw new Error('Phone number is required');
  }

  if (typeof amount !== 'number') {
    throw new Error('Amount must be a number');
  }

  if (typeof orderId !== 'string' || !orderId) {
    throw new Error('Order ID is required');
  }

  // Format phone number
  let formattedPhone: string;
  try {
    formattedPhone = formatPhoneToMpesa(phone);
  } catch {
    throw new Error('Invalid phone number format');
  }

  // Validate formatted phone
  const phoneError = validatePhoneNumber(formattedPhone);
  if (phoneError) {
    throw new Error(phoneError.message);
  }

  // Validate amount
  const amountError = validateAmount(amount);
  if (amountError) {
    throw new Error(amountError.message);
  }

  // Validate order ID
  const orderIdError = validateUUID(orderId, 'orderId');
  if (orderIdError) {
    throw new Error(orderIdError.message);
  }

  return {
    phone: formattedPhone,
    amount: Math.round(amount),
    orderId,
  };
}