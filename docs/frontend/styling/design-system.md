# Design System

## Overview

The Kavach design system is built on **Tailwind CSS v4** with **shadcn/ui** components, providing a consistent, accessible, and customizable visual language. The system uses CSS custom properties for theming and supports both light and dark modes.

## Design Tokens

### Color Palette

The design system uses a semantic color system with CSS custom properties that automatically adapt to light and dark themes.

#### Primary Colors

```css
/* Light Theme */
--primary: #4f46e5;           /* Indigo 600 - Primary brand color */
--primary-foreground: #ffffff; /* White text on primary */

/* Dark Theme */
--primary: #818cf8;           /* Indigo 400 - Lighter for dark mode */
--primary-foreground: #000000; /* Black text on primary */
```

**Usage:**
- Primary actions (buttons, links, CTAs)
- Brand elements and highlights
- Interactive states and focus indicators

#### Secondary Colors

```css
/* Light Theme */
--secondary: #14b8a6;         /* Teal 500 - Secondary brand color */
--secondary-foreground: #ffffff;

/* Dark Theme */
--secondary: #2dd4bf;         /* Teal 400 - Lighter for dark mode */
--secondary-foreground: #000000;
```

**Usage:**
- Secondary actions and buttons
- Accent elements and highlights
- Success states and confirmations

#### Accent Colors

```css
/* Light Theme */
--accent: #f59e0b;            /* Amber 500 - Accent color */
--accent-foreground: #000000;

/* Dark Theme */
--accent: #fcd34d;            /* Amber 300 - Lighter for dark mode */
--accent-foreground: #000000;
```

**Usage:**
- Warnings and important notices
- Highlighted content and badges
- Call-to-action elements

#### Semantic Colors

```css
/* Destructive (Error/Danger) */
--destructive: #ef4444;       /* Red 500 in light mode */
--destructive-foreground: #ffffff;

/* Background and Surface */
--background: #f7f9f3;        /* Light green-tinted background */
--card: #ffffff;              /* Pure white for cards */
--popover: #ffffff;           /* White for popovers */

/* Text Colors */
--foreground: #000000;        /* Primary text color */
--muted-foreground: #333333;  /* Secondary text color */

/* Interactive Elements */
--border: #000000;            /* Border color */
--input: #737373;             /* Input border color */
--ring: #a5b4fc;              /* Focus ring color */
```

#### Chart Colors

For data visualization and charts:

```css
--chart-1: #4f46e5;  /* Primary blue */
--chart-2: #14b8a6;  /* Teal */
--chart-3: #f59e0b;  /* Amber */
--chart-4: #ec4899;  /* Pink */
--chart-5: #22c55e;  /* Green */
```

### Typography

#### Font Families

```css
--font-sans: DM Sans, sans-serif;    /* Primary font for UI */
--font-serif: DM Sans, sans-serif;   /* Same as sans for consistency */
--font-mono: Space Mono, monospace;  /* Code and monospace text */
```

#### Font Sizes and Scales

The system uses Tailwind's default type scale:

```css
/* Text Sizes */
text-xs     /* 12px */
text-sm     /* 14px */
text-base   /* 16px */
text-lg     /* 18px */
text-xl     /* 20px */
text-2xl    /* 24px */
text-3xl    /* 30px */
text-4xl    /* 36px */
```

#### Typography Usage

```tsx
// Headings
<h1 className="text-3xl font-bold">Main Heading</h1>
<h2 className="text-2xl font-semibold">Section Heading</h2>
<h3 className="text-xl font-medium">Subsection Heading</h3>

// Body Text
<p className="text-base">Regular body text</p>
<p className="text-sm text-muted-foreground">Secondary text</p>

// Small Text
<span className="text-xs text-muted-foreground">Helper text</span>

// Code
<code className="font-mono text-sm bg-muted px-1 py-0.5 rounded">
  Code snippet
</code>
```

### Spacing and Layout

#### Spacing Scale

The system uses Tailwind's default spacing scale based on 0.25rem (4px) increments:

```css
/* Common Spacing Values */
space-1   /* 4px */
space-2   /* 8px */
space-3   /* 12px */
space-4   /* 16px */
space-6   /* 24px */
space-8   /* 32px */
space-12  /* 48px */
space-16  /* 64px */
```

#### Layout Patterns

```tsx
// Card Layout
<Card className="p-6 space-y-4">
  <CardHeader className="space-y-1.5">
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Content */}
  </CardContent>
</Card>

// Form Layout
<form className="space-y-6">
  <div className="space-y-2">
    <Label>Field Label</Label>
    <Input />
  </div>
</form>

// Button Groups
<div className="flex gap-2">
  <Button>Primary</Button>
  <Button variant="outline">Secondary</Button>
</div>
```

### Border Radius

```css
--radius: 1rem;               /* Base radius (16px) */
--radius-sm: calc(var(--radius) - 4px);  /* 12px */
--radius-md: calc(var(--radius) - 2px);  /* 14px */
--radius-lg: var(--radius);              /* 16px */
--radius-xl: calc(var(--radius) + 4px);  /* 20px */
```

**Usage:**
```tsx
// Different radius sizes
<div className="rounded-sm">Small radius</div>
<div className="rounded-md">Medium radius</div>
<div className="rounded-lg">Large radius</div>
<div className="rounded-xl">Extra large radius</div>
```

### Shadows

The system provides a comprehensive shadow scale:

```css
--shadow-xs: 0px 1px 2px -1px hsl(0 0% 10.1961% / 0.05);
--shadow-sm: 0px 1px 2px -1px hsl(0 0% 10.1961% / 0.05);
--shadow: 0px 1px 2px -1px hsl(0 0% 10.1961% / 0.05);
--shadow-md: 0px 2px 4px -1px hsl(0 0% 10.1961% / 0.05);
--shadow-lg: 0px 4px 6px -1px hsl(0 0% 10.1961% / 0.05);
--shadow-xl: 0px 8px 10px -1px hsl(0 0% 10.1961% / 0.05);
--shadow-2xl: 0px 0px 0px 0px hsl(0 0% 10.1961% / 0.13);
```

**Usage:**
```tsx
// Shadow applications
<Card className="shadow-sm">Subtle shadow</Card>
<Dialog className="shadow-lg">Modal dialog</Dialog>
<Popover className="shadow-md">Dropdown menu</Popover>
```

## Component Patterns

### Button Variants

```tsx
// Primary Actions
<Button>Primary Action</Button>
<Button size="lg">Large Primary</Button>

// Secondary Actions
<Button variant="outline">Secondary Action</Button>
<Button variant="secondary">Alternative Secondary</Button>

// Destructive Actions
<Button variant="destructive">Delete Item</Button>

// Subtle Actions
<Button variant="ghost">Ghost Button</Button>
<Button variant="link">Link Button</Button>

// Icon Buttons
<Button size="icon" variant="outline">
  <PlusIcon className="h-4 w-4" />
</Button>
```

### Form Components

```tsx
// Standard Form Field
<FormField
  control={form.control}
  name="fieldName"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Field Label</FormLabel>
      <FormControl>
        <Input placeholder="Enter value" {...field} />
      </FormControl>
      <FormDescription>
        Helper text for the field
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>

// Select Field
<FormField
  control={form.control}
  name="selectField"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Select Option</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Choose option" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Card Layouts

```tsx
// Basic Card
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>

// Stats Card
<Card>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
    <UsersIcon className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">1,234</div>
    <p className="text-xs text-muted-foreground">
      +20.1% from last month
    </p>
  </CardContent>
</Card>
```

### Navigation Patterns

```tsx
// Tab Navigation
<Tabs defaultValue="tab1" className="w-full">
  <TabsList className="grid w-full grid-cols-2">
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">
    <Card>
      <CardContent className="pt-6">
        <p>Tab 1 content</p>
      </CardContent>
    </Card>
  </TabsContent>
</Tabs>

// Breadcrumb Navigation
<nav className="flex" aria-label="Breadcrumb">
  <ol className="inline-flex items-center space-x-1 md:space-x-3">
    <li className="inline-flex items-center">
      <Button variant="link" className="p-0">Home</Button>
    </li>
    <li>
      <div className="flex items-center">
        <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
        <Button variant="link" className="p-0 ml-1">Category</Button>
      </div>
    </li>
    <li aria-current="page">
      <div className="flex items-center">
        <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
        <span className="ml-1 text-sm font-medium text-muted-foreground">
          Current Page
        </span>
      </div>
    </li>
  </ol>
</nav>
```

## Responsive Design

### Breakpoints

The system uses Tailwind's default breakpoints:

```css
sm: 640px   /* Small devices */
md: 768px   /* Medium devices */
lg: 1024px  /* Large devices */
xl: 1280px  /* Extra large devices */
2xl: 1536px /* 2X large devices */
```

### Responsive Patterns

```tsx
// Responsive Grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => (
    <Card key={item.id}>
      {/* Card content */}
    </Card>
  ))}
</div>

// Responsive Typography
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
  Responsive Heading
</h1>

// Responsive Spacing
<div className="p-4 md:p-6 lg:p-8">
  <p className="mb-4 md:mb-6">Responsive spacing</p>
</div>

// Responsive Layout
<div className="flex flex-col md:flex-row gap-4">
  <div className="flex-1">Main content</div>
  <div className="w-full md:w-64">Sidebar</div>
</div>
```

## Dark Mode

### Theme Toggle Implementation

```tsx
'use client';

import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { MoonIcon, SunIcon } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
    >
      <SunIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <MoonIcon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
```

### Dark Mode Considerations

```tsx
// Dark mode specific styling
<div className="bg-white dark:bg-gray-900 text-black dark:text-white">
  <p className="text-gray-600 dark:text-gray-300">
    Text that adapts to theme
  </p>
</div>

// Images with dark mode variants
<Image
  src="/logo-light.png"
  alt="Logo"
  className="block dark:hidden"
/>
<Image
  src="/logo-dark.png"
  alt="Logo"
  className="hidden dark:block"
/>
```

## Accessibility

### Color Contrast

All color combinations meet WCAG 2.1 AA standards:
- Normal text: 4.5:1 contrast ratio
- Large text: 3:1 contrast ratio
- Interactive elements: 3:1 contrast ratio

### Focus States

```tsx
// Focus ring implementation
<Button className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
  Accessible Button
</Button>

// Custom focus styles
<Input className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0" />
```

### Screen Reader Support

```tsx
// Proper labeling
<Button aria-label="Close dialog">
  <XIcon className="h-4 w-4" />
</Button>

// Descriptive text
<div>
  <span className="sr-only">Loading</span>
  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
</div>
```

## Animation and Motion

### Transition Classes

```tsx
// Hover transitions
<Button className="transition-colors hover:bg-primary/90">
  Smooth Hover
</Button>

// Transform transitions
<Card className="transition-transform hover:scale-105">
  Hover to Scale
</Card>

// Loading animations
<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
<div className="animate-pulse bg-muted h-4 w-full rounded" />
```

### Custom Animations

```css
/* Custom keyframes in globals.css */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}
```

## Best Practices

### Component Composition

1. **Use semantic HTML**: Choose appropriate HTML elements
2. **Compose with utility classes**: Build complex designs with simple utilities
3. **Maintain consistency**: Use design tokens consistently across components
4. **Consider accessibility**: Include proper ARIA attributes and focus management

### Performance

1. **Minimize custom CSS**: Use Tailwind utilities instead of custom styles
2. **Optimize for tree-shaking**: Import only needed components
3. **Use CSS variables**: Leverage CSS custom properties for theming
4. **Avoid inline styles**: Use Tailwind classes for better caching

### Maintenance

1. **Document custom patterns**: Create reusable component patterns
2. **Use design tokens**: Reference CSS variables instead of hardcoded values
3. **Test across themes**: Ensure components work in both light and dark modes
4. **Validate accessibility**: Regular accessibility audits and testing

## Customization

### Extending the Design System

```tsx
// Custom component with design system integration
interface CustomCardProps {
  variant?: 'default' | 'highlighted' | 'minimal';
  children: React.ReactNode;
}

export function CustomCard({ variant = 'default', children }: CustomCardProps) {
  const variants = {
    default: 'border shadow-sm',
    highlighted: 'border-2 border-primary shadow-md',
    minimal: 'border-0 shadow-none'
  };

  return (
    <Card className={cn('bg-card text-card-foreground', variants[variant])}>
      {children}
    </Card>
  );
}
```

### Theme Customization

```css
/* Custom theme in globals.css */
:root {
  /* Override default colors */
  --primary: #your-brand-color;
  --secondary: #your-secondary-color;
  
  /* Custom properties */
  --brand-gradient: linear-gradient(135deg, var(--primary), var(--secondary));
}

/* Custom utility classes */
.bg-brand-gradient {
  background: var(--brand-gradient);
}
```

## Related Documentation

- [UI Components](../components/ui-components.md) - Component implementation details
- [Tailwind Usage](./tailwind.md) - Tailwind-specific patterns and utilities
- [Accessibility Guide](../../development/coding-standards/accessibility.md) - Accessibility standards
- [Component Development](../../development/coding-standards/react.md) - React component patterns