# Maimoni App - UI Implementation

## 🎨 Design Aesthetic

Bold, modern financial app with dark mode by default. Inspired by Revolut and modern fintech apps with:

- **Dark theme**: Slate-950/900 gradients with vibrant accents
- **Color palette**: Emerald (income), Rose (expense), Violet (primary actions)
- **Typography**: Black weight headlines, tight tracking, system fonts
- **Glassmorphism**: Backdrop blur, layered transparencies
- **Mobile-first**: Optimized for touch with large tap targets
- **Smooth interactions**: Active scale transforms, gradient overlays

## 📱 Implemented Screens

### 1. Dashboard (`/`)
- **Balance card** with income/expense breakdown
- **Chronological movements list** grouped by date
- Each movement shows:
  - Category emoji
  - Category/subcategory name
  - Amount (+ for income, - for expense)
  - User name
  - Time
  - Optional note
- Quick add button (top right)

### 2. Add Movement (`/add`)
- **Type selector**: Expense/Income toggle
- **Amount input**: Large, focused input with $ prefix
- **Category selector**: 
  - Collapsed by default
  - Expands to show all categories
  - Emoji-first display
- **Note field**: Optional text input
- **AI Scan area**: Placeholder for receipt scanning
- **Save/Cancel buttons**

## 🗂️ File Structure

```
apps/webapp/src/
├── types/
│   └── index.ts          # Movement, Category, User types
├── data/
│   └── categories.ts     # All categories from plan.md
├── routes/
│   ├── index.tsx         # Dashboard (movements list)
│   └── add.tsx           # Quick add form
└── styles.css            # Global styles + mobile optimizations
```

## 🎯 Features Implemented

✅ Mobile-first responsive design
✅ Dark mode with vibrant gradients
✅ All categories from plan.md with emojis
✅ Mock data ready for backend integration
✅ Type-safe with TypeScript
✅ Smooth touch interactions
✅ Accessible form inputs
✅ Clean, self-documenting code

## 🚀 Next Steps

- [ ] Connect to backend API
- [ ] Implement AI receipt scanning
- [ ] Add subcategory selection
- [ ] Add date picker
- [ ] Implement filters/search
- [ ] Add animations with Framer Motion
- [ ] Implement delete/edit movements
- [ ] Add multi-user support
- [ ] Add spending limits feature

## 🎨 Design Tokens

```css
/* Colors */
Slate: 950, 900, 800, 700, 600, 500, 400
Emerald: 500, 400 (income)
Rose: 500, 400 (expense)
Violet: 600, 500, 400 (primary actions)

/* Spacing */
Mobile padding: px-5 (20px)
Card padding: p-6 (24px)
Input padding: p-4/p-5 (16-20px)

/* Border radius */
Cards: rounded-2xl/3xl (16-24px)
Buttons: rounded-xl/2xl (12-16px)

/* Shadows */
Cards: shadow-2xl
Primary actions: shadow-xl with colored glow
```

## 📝 Mock Data

Currently using mock movements with:
- 1 income (salary)
- 4 expenses (food, transport, shopping)
- 2 mock users (Henry, María)
- Dates from Feb 14-16, 2026

Replace with real API calls when backend is ready.
