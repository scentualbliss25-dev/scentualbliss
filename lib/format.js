// Helpers de formato (sin dependencias de Node — safe para client components)

// Formatea un precio COP para mostrar en la tienda
// 205000 → "$205.000"
export function formatCOP(amount) {
  if (!amount || amount === 0) return null;
  return '$' + new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
