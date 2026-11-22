import { z } from 'zod';

const name = z.string().trim().min(2, 'Mínimo 2 caracteres').max(80, 'Máximo 80 caracteres');
const description = z.string().trim().max(1000, 'Máximo 1000 caracteres');
const version = z.string().trim().regex(/^\d{1,3}\.\d{1,3}\.\d{1,3}$/, 'Usa el formato 1.0.0');

export const appCreateSchema = z.object({
  name,
  description: description.default(''),
  version: version.default('1.0.0'),
});

export const appUpdateSchema = z
  .object({
    name: name.optional(),
    description: description.optional(),
    version: version.optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'No hay nada que actualizar' });