import { z } from 'zod';

// Authentication Schemas
export const loginSchema = z.object({
  email: z.string()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" })
    .trim(),
  password: z.string()
    .min(1, { message: "Password is required" })
});

export const registerSchema = z.object({
  email: z.string()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" })
    .trim(),
  password: z.string()
    .min(12, { message: "Password must be at least 12 characters" })
    .max(72, { message: "Password must be less than 72 characters" })
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
    .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
    .regex(/[0-9]/, { message: "Password must contain at least one number" }),
  fullName: z.string()
    .min(2, { message: "Full name must be at least 2 characters" })
    .max(100, { message: "Full name must be less than 100 characters" })
    .trim(),
  phone: z.string()
    .regex(/^(254|0)[17]\d{8}$/, { 
      message: "Invalid Kenyan phone number. Use format: 254XXXXXXXXX or 07XXXXXXXX/01XXXXXXXX" 
    }),
  location: z.string()
    .min(2, { message: "Location must be at least 2 characters" })
    .max(200, { message: "Location must be less than 200 characters" })
    .trim(),
  companyName: z.string()
    .min(2, { message: "Company name must be at least 2 characters" })
    .max(200, { message: "Company name must be less than 200 characters" })
    .trim()
    .optional()
});

// Checkout Schema
export const checkoutSchema = z.object({
  deliveryAddress: z.string()
    .min(10, { message: "Delivery address must be at least 10 characters" })
    .max(500, { message: "Delivery address must be less than 500 characters" })
    .trim(),
  notes: z.string()
    .max(1000, { message: "Notes must be less than 1000 characters" })
    .trim()
    .optional()
});

// M-Pesa Payment Schema (for client-side validation)
export const mpesaPaymentSchema = z.object({
  phone: z.string()
    .regex(/^254[17]\d{8}$/, { 
      message: "Invalid M-Pesa phone number. Use format: 254XXXXXXXXX" 
    }),
  amount: z.number()
    .min(1, { message: "Amount must be at least 1 KES" })
    .max(1000000, { message: "Amount cannot exceed 1,000,000 KES" })
});
