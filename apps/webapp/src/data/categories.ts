import type { Category } from '../types';

export const EXPENSE_CATEGORIES: Category[] = [
  {
    id: 'food',
    name: 'Alimentación',
    emoji: '🍔',
    type: 'expense',
    subcategories: [
      { id: 'supermarket', name: 'Supermercados', emoji: '🛒' },
      { id: 'restaurants', name: 'Restaurantes', emoji: '🍽️' },
      { id: 'cafes', name: 'Cafeterías/Snacks', emoji: '☕' },
      { id: 'delivery', name: 'Delivery', emoji: '🛵' },
      { id: 'fast-food', name: 'Comida rápida', emoji: '🍟' },
      { id: 'drinks', name: 'Bebidas/Alcohol', emoji: '🍺' },
    ],
  },
  {
    id: 'transport',
    name: 'Transporte',
    emoji: '🚗',
    type: 'expense',
    subcategories: [
      { id: 'gas', name: 'Gasolina', emoji: '⛽' },
      { id: 'maintenance', name: 'Mantenimiento', emoji: '🔧' },
      { id: 'rideshare', name: 'Uber/Didi', emoji: '🚕' },
      { id: 'public', name: 'Transporte público', emoji: '🚌' },
      { id: 'tolls', name: 'Peajes', emoji: '🛣️' },
      { id: 'parking', name: 'Estacionamiento', emoji: '🅿️' },
    ],
  },
  {
    id: 'home',
    name: 'Vivienda & Servicios',
    emoji: '🏠',
    type: 'expense',
    subcategories: [
      { id: 'rent', name: 'Alquiler/Hipoteca', emoji: '🏡' },
      { id: 'electricity', name: 'Luz', emoji: '💡' },
      { id: 'water', name: 'Agua', emoji: '🚿' },
      { id: 'gas-home', name: 'Gas', emoji: '🔥' },
      { id: 'internet', name: 'Internet/Telefonía', emoji: '🌐' },
      { id: 'maintenance-home', name: 'Mantenimiento', emoji: '🛠️' },
      { id: 'security', name: 'Seguridad/Admin', emoji: '🛡️' },
      { id: 'furniture', name: 'Muebles/Jardín', emoji: '🪑' },
    ],
  },
  {
    id: 'health',
    name: 'Salud & Bienestar',
    emoji: '🏥',
    type: 'expense',
    subcategories: [
      { id: 'pharmacy', name: 'Farmacia', emoji: '💊' },
      { id: 'medical', name: 'Consultas médicas', emoji: '🩺' },
      { id: 'dental', name: 'Dentista', emoji: '🦷' },
      { id: 'gym', name: 'Gim./Deportes', emoji: '🏋️' },
      { id: 'personal-care', name: 'Cuidado personal', emoji: '✂️' },
      { id: 'insurance', name: 'Seguro salud', emoji: '❤️' },
      { id: 'optics', name: 'Óptica', emoji: '👓' },
    ],
  },
  {
    id: 'entertainment',
    name: 'Entretenimiento',
    emoji: '🎬',
    type: 'expense',
    subcategories: [
      { id: 'events', name: 'Cine/Eventos', emoji: '🎟️' },
      { id: 'streaming', name: 'Streaming', emoji: '📺' },
      { id: 'bars', name: 'Bares/Discotecas', emoji: '🍹' },
      { id: 'hobbies', name: 'Hobbies/Juegos', emoji: '🎮' },
      { id: 'subscriptions', name: 'Suscripciones', emoji: '💳' },
    ],
  },
  {
    id: 'shopping',
    name: 'Compras & Shopping',
    emoji: '🛍️',
    type: 'expense',
    subcategories: [
      { id: 'clothes', name: 'Ropa/Calzado', emoji: '👕' },
      { id: 'electronics', name: 'Electrónica', emoji: '📱' },
      { id: 'accessories', name: 'Accesorios', emoji: '👜' },
      { id: 'gifts', name: 'Regalos', emoji: '🎁' },
      { id: 'pets', name: 'Mascotas', emoji: '🐶' },
      { id: 'stores', name: 'Tiendas', emoji: '🏬' },
      { id: 'online', name: 'Compras online', emoji: '📦' },
    ],
  },
  {
    id: 'education',
    name: 'Educación',
    emoji: '🎓',
    type: 'expense',
    subcategories: [
      { id: 'courses', name: 'Cursos', emoji: '📚' },
      { id: 'tuition', name: 'Colegiaturas', emoji: '🏫' },
      { id: 'books', name: 'Libros', emoji: '📖' },
      { id: 'supplies', name: 'Papelería', emoji: '✏️' },
      { id: 'software', name: 'Software educativo', emoji: '💻' },
    ],
  },
  {
    id: 'travel',
    name: 'Viajes',
    emoji: '✈️',
    type: 'expense',
    subcategories: [
      { id: 'tickets', name: 'Boletos', emoji: '🎫' },
      { id: 'lodging', name: 'Hospedaje', emoji: '🏨' },
      { id: 'car-rental', name: 'Alq. autos', emoji: '🚙' },
      { id: 'travel-expenses', name: 'Gastos viaje', emoji: '🧳' },
    ],
  },
  {
    id: 'financial',
    name: 'Financiero & Legal',
    emoji: '💳',
    type: 'expense',
    subcategories: [
      { id: 'card-payment', name: 'Pago tarjeta', emoji: '💳' },
      { id: 'fees', name: 'Comisiones', emoji: '🏦' },
      { id: 'interest', name: 'Intereses', emoji: '📉' },
      { id: 'taxes', name: 'Impuestos', emoji: '🧾' },
      { id: 'insurance-general', name: 'Seguros', emoji: '🛡️' },
      { id: 'atm', name: 'Cajero', emoji: '🏧' },
    ],
  },
  {
    id: 'other',
    name: 'Otros',
    emoji: '📦',
    type: 'expense',
  },
];

export const INCOME_CATEGORIES: Category[] = [
  {
    id: 'salary',
    name: 'Sueldo',
    emoji: '💼',
    type: 'income',
  },
  {
    id: 'transfers',
    name: 'Transferencias',
    emoji: '🔁',
    type: 'income',
  },
  {
    id: 'refunds',
    name: 'Reembolsos',
    emoji: '💸',
    type: 'income',
  },
  {
    id: 'interest-income',
    name: 'Intereses',
    emoji: '📈',
    type: 'income',
  },
  {
    id: 'sales',
    name: 'Ventas',
    emoji: '🛒',
    type: 'income',
  },
];

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export function getCategoryById(id: string): Category | undefined {
  return ALL_CATEGORIES.find((cat) => cat.id === id);
}
