import { z } from 'zod';

const email = z.string().trim().toLowerCase().max(254).email('Correo inválido');

export const registerSchema = z.object({
  email,
  displayName: z.string().trim().min(2, 'Mínimo 2 caracteres').max(50, 'Máximo 50 caracteres'),
  password: z
    .string()
    .min(10, 'La contraseña debe tener al menos 10 caracteres')
    .max(128, 'La contraseña es demasiado larga')
    .regex(/[A-Za-z]/, 'Debe incluir al menos una letra')
    .regex(/\d/, 'Debe incluir al menos un número'),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});