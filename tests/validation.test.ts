import { describe, it, expect } from 'vitest';
import { loginSchema, registerSchema, checkoutSchema, mpesaPaymentSchema } from '../src/lib/validationSchemas';

describe('Login Schema', () => {
  it('should validate correct login data', () => {
    const validData = {
      email: 'test@example.com',
      password: 'password123',
    };
    const result = loginSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const invalidData = {
      email: 'invalid-email',
      password: 'password123',
    };
    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject empty password', () => {
    const invalidData = {
      email: 'test@example.com',
      password: '',
    };
    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('Register Schema', () => {
  it('should validate correct registration data', () => {
    const validData = {
      email: 'test@example.com',
      password: 'SecurePass123',
      fullName: 'John Doe',
      phone: '254712345678',
      location: 'Nairobi, Kenya',
    };
    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject weak password', () => {
    const invalidData = {
      email: 'test@example.com',
      password: 'weak',
      fullName: 'John Doe',
      phone: '254712345678',
      location: 'Nairobi, Kenya',
    };
    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject invalid Kenyan phone number', () => {
    const invalidData = {
      email: 'test@example.com',
      password: 'SecurePass123',
      fullName: 'John Doe',
      phone: '1234567890',
      location: 'Nairobi, Kenya',
    };
    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should accept phone number starting with 07', () => {
    const validData = {
      email: 'test@example.com',
      password: 'SecurePass123',
      fullName: 'John Doe',
      phone: '0712345678',
      location: 'Nairobi, Kenya',
    };
    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});

describe('Checkout Schema', () => {
  it('should validate correct checkout data', () => {
    const validData = {
      deliveryAddress: 'Westlands, Nairobi, Kenya',
      notes: 'Leave at the gate',
    };
    const result = checkoutSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject short address', () => {
    const invalidData = {
      deliveryAddress: 'Short',
    };
    const result = checkoutSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should allow empty notes', () => {
    const validData = {
      deliveryAddress: 'Westlands, Nairobi, Kenya',
    };
    const result = checkoutSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});

describe('M-Pesa Payment Schema', () => {
  it('should validate correct payment data', () => {
    const validData = {
      phone: '254712345678',
      amount: 1000,
    };
    const result = mpesaPaymentSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid phone format', () => {
    const invalidData = {
      phone: '0712345678',
      amount: 1000,
    };
    const result = mpesaPaymentSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject zero amount', () => {
    const invalidData = {
      phone: '254712345678',
      amount: 0,
    };
    const result = mpesaPaymentSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject amount exceeding limit', () => {
    const invalidData = {
      phone: '254712345678',
      amount: 2000000,
    };
    const result = mpesaPaymentSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});