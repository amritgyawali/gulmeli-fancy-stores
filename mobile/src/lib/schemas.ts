import { z } from "zod";

// Shared validation schemas, used with React Hook Form on the sign-in screen.

export const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .pipe(z.email("Enter a valid email address.")),
  password: z
    .string()
    .min(8, "Use a password with at least 8 characters."),
});
export type Credentials = z.infer<typeof credentialsSchema>;

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(150),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 -]{7,20}$/, "Enter a valid phone number."),
  address: z
    .string()
    .trim()
    .min(8, "Enter your delivery address (at least 8 characters).")
    .max(1000),
});
export type ProfileForm = z.infer<typeof profileSchema>;
