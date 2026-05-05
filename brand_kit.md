# Kavach Dashboard Brand Kit

This document outlines the visual identity and design system for the Kavach Dashboard, ensuring consistency across Authentication, Dashboard, and Service Request pages.

## 1. Color Palette

The color system is built primarily on **Slate** neutrals and **Indigo** primary actions, with functional colors for status.

### Primary Colors

* **Indigo (Brand Primary)**
  * Main: `indigo-600` (#4f46e5) - Used for primary buttons, active tabs (Expert), and links.
  * Hover: `indigo-700` - Button hover states.
  * Light: `indigo-50` - Backgrounds for active items, badges.
  * Border: `indigo-200` - Hover borders on cards.

### Secondary Colors

* **Emerald (Success / Customer)**
  * Main: `emerald-600` (#059669) - Active tab (Customer), success states, approve buttons.
  * Light: `emerald-50` - Success backgrounds.

### Neutrals (Slate)

Used for text, borders, and backgrounds to provide a clean, professional look.

* **Text High:** `slate-900` - Headings, primary text.
* **Text Medium:** `slate-600` - Body text, descriptions.
* **Text Low:** `slate-500` - Meta info, placeholders.
* **Background:** `slate-50` / `slate-100` - Page backgrounds, secondary areas.
* **Borders:** `slate-200` - Card borders, dividers.

### Functional

* **Destructive:** `red-600` / `red-50` - Error messages, destructive actions, rejection.
* **Warning:** `amber-600` / `amber-50` - Pending statuses, alerts.

## 2. Typography

* **Font Family Sans:** `DM Sans` (Variable weight).
* **Font Family Mono:** `Space Mono` (For codes, technical data).

### Usage

* **Headings:** `font-bold` or `font-semibold`, `text-slate-900`.
  * Page Titles: `text-2xl` or `text-3xl`, `tracking-tight`.
  * Card Titles: `text-lg` or `text-base`.
* **Subheadings:** `text-sm`, `font-medium`, `text-muted-foreground` or `text-slate-500`.
* **Body:** `text-sm`, `text-slate-600`.
* **Overlines:** `text-xs`, `uppercase`, `tracking-[0.28em]`, `font-semibold` (Used in Auth "Welcome").

## 3. UI Components & Elements

### Cards

Modern, clean cards with interactive hover states.

* **Base:** `bg-white`, `border border-slate-200`, `rounded-xl`, `shadow-sm`.
* **Hover Effect:** `hover:shadow-lg`, `hover:border-indigo-200`, `hover:-translate-y-1`, `hover:bg-indigo-50/60` (subtle tint).
* **Transition:** `transition-all duration-300 ease-out`.

### Buttons

* **Primary:** `bg-indigo-600 text-white hover:bg-indigo-700`.
* **Secondary/Outline:** `border-2 border-indigo-500 text-indigo-600 hover:bg-indigo-600 hover:text-white`.
* **Ghost:** `hover:bg-slate-100 text-slate-600`.
* **Shape:** `rounded-lg` or `rounded-md`.

### Badges / Tags

* **Shape:** `rounded-full`.
* **Size:** `px-2.5 py-1` (or `px-2 py-0.5`), `text-xs`, `font-medium`.
* **Style:** Subtle backgrounds (e.g., `bg-indigo-50 text-indigo-700`).

### Dialogs / Modals

* **Overlay:** `backdrop-blur-sm` (implied by default overlay).
* **Content:** `bg-white`, `rounded-lg`, `shadow-xl`, `sm:max-w-2xl`.
* **Accessibility:** Must include `<DialogTitle>` and `<DialogDescription>` (VisuallyHidden if not needed visible).

### Tabs (Auth/Dashboard)

* **List Background:** `bg-slate-100`, `rounded-xl`, `p-1`.
* **Trigger:** `rounded-lg`, `data-[state=active]:shadow-lg`.
  * **Customer Active:** `bg-emerald-600 text-white`.
  * **Expert Active:** `bg-indigo-600 text-white`.

## 4. Effects (Glassmorphism)

Used primarily in Authentication screens.

* **Surface:** `bg-white/95`, `backdrop-blur-lg`.
* **Border:** `border-white/40`.
* **Shadow:** `shadow-2xl`.

## 5. Layout Patterns

* **Container:** `container mx-auto`.
* **Spacing:** `space-y-4` or `space-y-6` for vertical rhythm.
* **Grid:** Responsive grids (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`) with `gap-6`.

## 6. Logo

* **Text:** "Kavach"
* **Usage:** Prominent in Navbar and Auth screens.
