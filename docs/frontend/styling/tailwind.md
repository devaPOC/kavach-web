# Tailwind CSS Usage Guide

## Overview

Kavach uses **Tailwind CSS v4** with the new CSS-first architecture, providing a utility-first approach to styling with improved performance and developer experience. The setup integrates seamlessly with **shadcn/ui** components and supports custom theming through CSS variables.

## Configuration

### Project Setup

The project uses Tailwind CSS v4 with PostCSS integration:

**PostCSS Configuration** (`postcss.config.mjs`):
```javascript
const config = {
  plugins: ["@tailwindcss/postcss"],
};

export default config;
```

**Global Styles** (`src/app/globals.css`):
```css
@import "tailwindcss";

/* CSS variables for theming */
:root {
  --background: #f7f9f3;
  --foreground: #000000;
  /* ... other design tokens */
}
```

### shadcn/ui Integration

**Components Configuration** (`components.json`):
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  },
  "iconLibrary": "lucide"
}
```

## Core Utilities

### Layout and Spacing

#### Flexbox Patterns

```tsx
// Horizontal layout with gap
<div className="flex items-center gap-4">
  <Button>Action 1</Button>
  <Button variant="outline">Action 2</Button>
</div>

// Vertical stack with spacing
<div className="flex flex-col space-y-4">
  <Card>Item 1</Card>
  <Card>Item 2</Card>
</div>

// Responsive flex direction
<div className="flex flex-col md:flex-row gap-4">
  <div className="flex-1">Main content</div>
  <div className="w-full md:w-64">Sidebar</div>
</div>

// Center content
<div className="flex items-center justify-center min-h-screen">
  <Card>Centered content</Card>
</div>
```

#### Grid Layouts

```tsx
// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map(item => (
    <Card key={item.id}>
      {/* Card content */}
    </Card>
  ))}
</div>

// Auto-fit grid
<div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
  {/* Auto-sizing cards */}
</div>

// Complex grid layout
<div className="grid grid-cols-12 gap-4">
  <div className="col-span-12 md:col-span-8">Main</div>
  <div className="col-span-12 md:col-span-4">Sidebar</div>
</div>
```

#### Spacing System

```tsx
// Consistent spacing patterns
<div className="p-4 md:p-6 lg:p-8">
  <h2 className="mb-4 text-xl font-semibold">Title</h2>
  <div className="space-y-3">
    <p>Paragraph 1</p>
    <p>Paragraph 2</p>
  </div>
</div>

// Form spacing
<form className="space-y-6">
  <div className="space-y-2">
    <Label>Field Label</Label>
    <Input />
  </div>
  <div className="space-y-2">
    <Label>Another Field</Label>
    <Input />
  </div>
</form>
```

### Typography

#### Text Sizing and Hierarchy

```tsx
// Heading hierarchy
<div className="space-y-4">
  <h1 className="text-3xl font-bold tracking-tight">Main Heading</h1>
  <h2 className="text-2xl font-semibold">Section Heading</h2>
  <h3 className="text-xl font-medium">Subsection</h3>
  <h4 className="text-lg font-medium">Minor Heading</h4>
</div>

// Body text variations
<div className="space-y-2">
  <p className="text-base">Regular body text</p>
  <p className="text-sm text-muted-foreground">Secondary text</p>
  <p className="text-xs text-muted-foreground">Helper text</p>
</div>

// Responsive typography
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
  Responsive Heading
</h1>
```

#### Text Styling

```tsx
// Font weights and styles
<div className="space-y-2">
  <p className="font-light">Light text</p>
  <p className="font-normal">Normal text</p>
  <p className="font-medium">Medium text</p>
  <p className="font-semibold">Semibold text</p>
  <p className="font-bold">Bold text</p>
</div>

// Text alignment
<div className="space-y-2">
  <p className="text-left">Left aligned</p>
  <p className="text-center">Center aligned</p>
  <p className="text-right">Right aligned</p>
  <p className="text-justify">Justified text</p>
</div>

// Text decoration
<div className="space-y-2">
  <p className="underline">Underlined text</p>
  <p className="line-through">Strikethrough text</p>
  <p className="no-underline">No underline</p>
</div>
```

### Colors and Theming

#### Semantic Colors

```tsx
// Background colors
<div className="bg-background text-foreground">
  <Card className="bg-card text-card-foreground">
    <p className="text-muted-foreground">Muted text</p>
  </Card>
</div>

// Interactive colors
<div className="space-y-2">
  <Button className="bg-primary text-primary-foreground">Primary</Button>
  <Button className="bg-secondary text-secondary-foreground">Secondary</Button>
  <Button className="bg-destructive text-destructive-foreground">Destructive</Button>
</div>

// State colors
<div className="space-y-2">
  <Alert className="border-green-200 bg-green-50 text-green-800">
    Success message
  </Alert>
  <Alert className="border-yellow-200 bg-yellow-50 text-yellow-800">
    Warning message
  </Alert>
  <Alert variant="destructive">
    Error message
  </Alert>
</div>
```

#### Custom Color Usage

```tsx
// Using CSS variables
<div className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
  Custom themed element
</div>

// Chart colors
<div className="space-x-2">
  <div className="w-4 h-4 bg-[hsl(var(--chart-1))] rounded"></div>
  <div className="w-4 h-4 bg-[hsl(var(--chart-2))] rounded"></div>
  <div className="w-4 h-4 bg-[hsl(var(--chart-3))] rounded"></div>
</div>
```

### Borders and Shadows

#### Border Patterns

```tsx
// Border styles
<div className="space-y-4">
  <Card className="border">Default border</Card>
  <Card className="border-2">Thick border</Card>
  <Card className="border-dashed">Dashed border</Card>
  <Card className="border-t-4 border-primary">Top accent border</Card>
</div>

// Border radius
<div className="space-y-4">
  <div className="rounded-sm bg-muted p-4">Small radius</div>
  <div className="rounded-md bg-muted p-4">Medium radius</div>
  <div className="rounded-lg bg-muted p-4">Large radius</div>
  <div className="rounded-xl bg-muted p-4">Extra large radius</div>
</div>
```

#### Shadow Usage

```tsx
// Shadow hierarchy
<div className="space-y-4">
  <Card className="shadow-sm">Subtle shadow</Card>
  <Card className="shadow">Default shadow</Card>
  <Card className="shadow-md">Medium shadow</Card>
  <Card className="shadow-lg">Large shadow</Card>
  <Card className="shadow-xl">Extra large shadow</Card>
</div>

// Interactive shadows
<Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
  Hover for shadow change
</Card>
```

## Responsive Design Patterns

### Breakpoint Usage

```tsx
// Mobile-first responsive design
<div className="w-full sm:w-auto md:w-1/2 lg:w-1/3 xl:w-1/4">
  Responsive width
</div>

// Responsive padding and margins
<div className="p-4 sm:p-6 md:p-8 lg:p-12">
  <h2 className="mb-2 sm:mb-4 md:mb-6">Responsive spacing</h2>
</div>

// Responsive text
<h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl">
  Responsive heading
</h1>
```

### Layout Responsiveness

```tsx
// Responsive navigation
<nav className="flex flex-col sm:flex-row gap-2 sm:gap-4">
  <Button className="w-full sm:w-auto">Home</Button>
  <Button className="w-full sm:w-auto">About</Button>
  <Button className="w-full sm:w-auto">Contact</Button>
</nav>

// Responsive card grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {cards.map(card => (
    <Card key={card.id} className="w-full">
      {/* Card content */}
    </Card>
  ))}
</div>

// Responsive sidebar layout
<div className="flex flex-col lg:flex-row gap-6">
  <main className="flex-1 order-2 lg:order-1">
    Main content
  </main>
  <aside className="w-full lg:w-64 order-1 lg:order-2">
    Sidebar content
  </aside>
</div>
```

## Component-Specific Patterns

### Form Styling

```tsx
// Form layout patterns
<form className="space-y-6 max-w-md mx-auto">
  <div className="space-y-2">
    <Label htmlFor="email" className="text-sm font-medium">
      Email Address
    </Label>
    <Input
      id="email"
      type="email"
      className="w-full"
      placeholder="Enter your email"
    />
  </div>
  
  <div className="grid grid-cols-2 gap-4">
    <div className="space-y-2">
      <Label htmlFor="firstName">First Name</Label>
      <Input id="firstName" placeholder="John" />
    </div>
    <div className="space-y-2">
      <Label htmlFor="lastName">Last Name</Label>
      <Input id="lastName" placeholder="Doe" />
    </div>
  </div>
  
  <Button type="submit" className="w-full">
    Submit Form
  </Button>
</form>

// Form validation states
<div className="space-y-2">
  <Label htmlFor="email" className="text-sm font-medium">
    Email Address
  </Label>
  <Input
    id="email"
    type="email"
    className="border-red-500 focus:border-red-500 focus:ring-red-500"
    placeholder="Enter your email"
    aria-invalid="true"
  />
  <p className="text-sm text-red-600">Please enter a valid email address</p>
</div>
```

### Button Variations

```tsx
// Button size variations
<div className="flex items-center gap-2">
  <Button size="sm">Small</Button>
  <Button size="default">Default</Button>
  <Button size="lg">Large</Button>
</div>

// Button with icons
<div className="space-x-2">
  <Button>
    <PlusIcon className="w-4 h-4 mr-2" />
    Add Item
  </Button>
  
  <Button variant="outline">
    <DownloadIcon className="w-4 h-4 mr-2" />
    Download
  </Button>
  
  <Button size="icon" variant="ghost">
    <SettingsIcon className="w-4 h-4" />
  </Button>
</div>

// Loading button states
<Button disabled className="opacity-50 cursor-not-allowed">
  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
  Loading...
</Button>
```

### Card Layouts

```tsx
// Basic card structure
<Card className="overflow-hidden">
  <CardHeader className="bg-muted/50">
    <CardTitle className="flex items-center gap-2">
      <UserIcon className="w-5 h-5" />
      User Profile
    </CardTitle>
    <CardDescription>
      Manage your account settings
    </CardDescription>
  </CardHeader>
  <CardContent className="p-6">
    <div className="space-y-4">
      {/* Content */}
    </div>
  </CardContent>
  <CardFooter className="bg-muted/50 px-6 py-3">
    <Button className="ml-auto">Save Changes</Button>
  </CardFooter>
</Card>

// Stats card
<Card>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
    <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">$45,231.89</div>
    <p className="text-xs text-muted-foreground">
      <span className="text-green-600">+20.1%</span> from last month
    </p>
  </CardContent>
</Card>
```

## Animation and Transitions

### Hover Effects

```tsx
// Button hover effects
<Button className="transition-all duration-200 hover:scale-105 hover:shadow-md">
  Hover to Scale
</Button>

// Card hover effects
<Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
  Interactive Card
</Card>

// Link hover effects
<a className="text-primary hover:text-primary/80 transition-colors duration-200 underline-offset-4 hover:underline">
  Hover Link
</a>
```

### Loading States

```tsx
// Skeleton loading
<div className="space-y-3">
  <div className="h-4 bg-muted animate-pulse rounded"></div>
  <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
  <div className="h-4 bg-muted animate-pulse rounded w-1/2"></div>
</div>

// Spinner loading
<div className="flex items-center justify-center p-8">
  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
</div>

// Pulse loading
<Card className="animate-pulse">
  <CardHeader>
    <div className="h-6 bg-muted rounded w-1/3"></div>
    <div className="h-4 bg-muted rounded w-2/3"></div>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      <div className="h-4 bg-muted rounded"></div>
      <div className="h-4 bg-muted rounded w-5/6"></div>
    </div>
  </CardContent>
</Card>
```

### Focus States

```tsx
// Custom focus rings
<Button className="focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:outline-none">
  Custom Focus
</Button>

// Focus within containers
<div className="p-4 border rounded-lg focus-within:ring-2 focus-within:ring-primary focus-within:border-primary">
  <Label htmlFor="input">Label</Label>
  <Input id="input" className="mt-1" />
</div>
```

## Dark Mode Implementation

### Theme-Aware Components

```tsx
// Dark mode responsive elements
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
  <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
    <CardContent>
      <p className="text-gray-600 dark:text-gray-300">
        Content that adapts to theme
      </p>
    </CardContent>
  </Card>
</div>

// Images with theme variants
<div>
  <img
    src="/logo-light.png"
    alt="Logo"
    className="block dark:hidden"
  />
  <img
    src="/logo-dark.png"
    alt="Logo"
    className="hidden dark:block"
  />
</div>

// Icons with theme colors
<SunIcon className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
<MoonIcon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
```

## Performance Optimization

### Utility Class Organization

```tsx
// Group related utilities
<div className={cn(
  // Layout
  "flex items-center justify-between",
  // Spacing
  "p-4 gap-3",
  // Appearance
  "bg-white border rounded-lg shadow-sm",
  // Interactive
  "hover:shadow-md transition-shadow duration-200",
  // Responsive
  "sm:p-6 md:gap-4"
)}>
  Content
</div>
```

### Conditional Classes

```tsx
// Using clsx/cn for conditional classes
import { cn } from '@/lib/utils';

interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

function CustomButton({ variant = 'primary', size = 'md', disabled }: ButtonProps) {
  return (
    <button
      className={cn(
        // Base styles
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        // Variants
        {
          "bg-primary text-primary-foreground hover:bg-primary/90": variant === 'primary',
          "bg-secondary text-secondary-foreground hover:bg-secondary/80": variant === 'secondary',
        },
        // Sizes
        {
          "h-8 px-3 text-sm": size === 'sm',
          "h-10 px-4": size === 'md',
          "h-12 px-6 text-lg": size === 'lg',
        },
        // States
        {
          "opacity-50 cursor-not-allowed": disabled,
        }
      )}
      disabled={disabled}
    >
      Button Text
    </button>
  );
}
```

## Best Practices

### Class Organization

1. **Logical grouping**: Group related utilities together
2. **Consistent order**: Layout → Spacing → Typography → Colors → Effects
3. **Use cn() utility**: Combine classes conditionally with the cn utility
4. **Avoid arbitrary values**: Use design tokens instead of arbitrary values when possible

### Responsive Design

1. **Mobile-first**: Start with mobile styles and add larger breakpoints
2. **Consistent breakpoints**: Use the same breakpoints across the application
3. **Test all sizes**: Verify layouts work at all breakpoint ranges
4. **Progressive enhancement**: Ensure core functionality works without JavaScript

### Performance

1. **Minimize custom CSS**: Use Tailwind utilities instead of custom styles
2. **Purge unused styles**: Tailwind automatically removes unused styles in production
3. **Avoid deep nesting**: Keep utility combinations simple and readable
4. **Use component abstractions**: Create reusable components for complex patterns

### Accessibility

1. **Focus indicators**: Ensure all interactive elements have visible focus states
2. **Color contrast**: Verify sufficient contrast ratios for all text
3. **Screen reader support**: Use semantic HTML and ARIA attributes
4. **Keyboard navigation**: Test all interactions with keyboard only

## Troubleshooting

### Common Issues

**Styles not applying:**
```tsx
// ❌ Wrong - styles might be purged
<div className="bg-red-500">Content</div>

// ✅ Correct - use semantic colors
<div className="bg-destructive">Content</div>
```

**Responsive styles not working:**
```tsx
// ❌ Wrong - missing base style
<div className="md:block">Content</div>

// ✅ Correct - include base style
<div className="hidden md:block">Content</div>
```

**Dark mode not working:**
```tsx
// ❌ Wrong - hardcoded colors
<div className="bg-white text-black">Content</div>

// ✅ Correct - semantic colors
<div className="bg-background text-foreground">Content</div>
```

### Debugging Tips

1. **Use browser dev tools**: Inspect elements to see which classes are applied
2. **Check CSS variables**: Verify CSS custom properties are defined
3. **Test responsive breakpoints**: Use browser dev tools to test different screen sizes
4. **Validate HTML**: Ensure proper HTML structure for styling to work correctly

## Related Documentation

- [Design System](./design-system.md) - Design tokens and component patterns
- [UI Components](../components/ui-components.md) - Component implementation details
- [Responsive Design](../../development/coding-standards/responsive-design.md) - Responsive design guidelines
- [Performance Guide](../../development/coding-standards/performance.md) - Performance optimization techniques