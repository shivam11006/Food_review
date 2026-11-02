// src/validations/index.ts
import { z } from 'zod';

export const signUpSchema = z
  .object({
    full_name: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export const signInSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});

export const partySchema = z.object({
  party_name: z.string().min(3, 'Party name must be at least 3 characters'),
  description: z.string().optional(),
  event_date: z.string().min(1, 'Event date is required'),
  venue: z.string().optional(),
  review_deadline: z.string().optional(),
});

export const foodItemSchema = z.object({
  dish_name: z.string().min(2, 'Dish name must be at least 2 characters'),
  description: z.string().optional(),
  category: z.enum(['Starter', 'Main Course', 'Dessert', 'Beverage', 'Snack', 'Other']),
});

export const reviewSchema = z.object({
  reviewer_name: z.string().min(2, 'Your name must be at least 2 characters'),
  rating: z.number().min(1).max(5),
  feedback: z.string().optional(),
});

export type SignUpFormData = z.infer<typeof signUpSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type PartyFormData = z.infer<typeof partySchema>;
export type FoodItemFormData = z.infer<typeof foodItemSchema>;
export type ReviewFormData = z.infer<typeof reviewSchema>;
