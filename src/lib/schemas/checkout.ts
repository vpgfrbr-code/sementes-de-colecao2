import { z } from "zod";
import { isValidCpf } from "@/lib/cpf";

export const CheckoutSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  cpf: z
    .string()
    .min(1, "CPF é obrigatório")
    .refine((v) => isValidCpf(v), { message: "CPF inválido" }),
  clerkUserId: z.string().optional(),
  couponCode: z.string().optional(),
  address: z.object({
    street: z.string().min(3),
    number: z.string().min(1),
    complement: z.string().optional().default(""),
    neighborhood: z.string().min(2),
    city: z.string().min(2),
    state: z.string().length(2),
    zip: z.string().regex(/^\d{5}-?\d{3}$/),
  }),
  items: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
  // Browser-reported timezone offset in MINUTES east of UTC at submit time
  // (i.e. -new Date().getTimezoneOffset()). Optional; falls back to NULL when
  // the client cannot or does not provide it.
  customerTzOffset: z
    .number()
    .int()
    .min(-1440)
    .max(1440)
    .optional(),
});

export type CheckoutInput = z.infer<typeof CheckoutSchema>;
