export const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

export function invalid(res, zodError) {
  return res.status(400).json({
    error: 'Datos inválidos',
    details: zodError.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
  });
}