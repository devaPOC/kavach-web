# UI Components Reference

## Overview

The UI components are built on top of [shadcn/ui](https://ui.shadcn.com/), providing a consistent, accessible, and customizable design system. All components are built with TypeScript, Tailwind CSS, and Radix UI primitives.

## Component Categories

### Form Controls

#### Button

A versatile button component with multiple variants and sizes.

**Import:**
```typescript
import { Button } from '@/components/ui/button';
```

**Props:**
```typescript
interface ButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
}
```

**Usage Examples:**
```tsx
// Default button
<Button>Click me</Button>

// Destructive action
<Button variant="destructive">Delete</Button>

// Outline style
<Button variant="outline">Cancel</Button>

// Different sizes
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>

// Icon button
<Button size="icon">
  <PlusIcon className="h-4 w-4" />
</Button>

// Loading state
<Button disabled>
  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
  Loading...
</Button>
```

**Variants:**
- `default` - Primary blue button
- `destructive` - Red button for dangerous actions
- `outline` - Outlined button with transparent background
- `secondary` - Secondary gray button
- `ghost` - Transparent button with hover effects
- `link` - Text button styled as a link

#### Input

A styled input field with consistent styling and validation states.

**Import:**
```typescript
import { Input } from '@/components/ui/input';
```

**Props:**
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  type?: string;
}
```

**Usage Examples:**
```tsx
// Basic input
<Input placeholder="Enter your name" />

// Email input
<Input type="email" placeholder="email@example.com" />

// With validation error
<Input 
  className="border-red-500" 
  placeholder="Required field"
  aria-invalid="true"
/>

// Disabled state
<Input disabled placeholder="Disabled input" />
```

**Features:**
- Automatic focus styling with ring effect
- Error state styling with `aria-invalid`
- File input styling
- Responsive text sizing
- Dark mode support

#### PasswordInput

A specialized input component for passwords with visibility toggle.

**Import:**
```typescript
import { PasswordInput } from '@/components/ui/password-input';
```

**Props:**
```typescript
interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}
```

**Usage Examples:**
```tsx
// Basic password input
<PasswordInput placeholder="Enter password" />

// With form integration
<PasswordInput
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  placeholder="Create password"
  autoComplete="new-password"
/>
```

**Features:**
- Toggle password visibility with eye icon
- Maintains all standard input functionality
- Accessible keyboard navigation
- Consistent styling with other inputs

#### Select

A dropdown select component with search and grouping capabilities.

**Import:**
```typescript
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
```

**Usage Examples:**
```tsx
<Select>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
    <SelectItem value="option3">Option 3</SelectItem>
  </SelectContent>
</Select>

// With groups
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select country" />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectLabel>North America</SelectLabel>
      <SelectItem value="us">United States</SelectItem>
      <SelectItem value="ca">Canada</SelectItem>
    </SelectGroup>
    <SelectGroup>
      <SelectLabel>Europe</SelectLabel>
      <SelectItem value="uk">United Kingdom</SelectItem>
      <SelectItem value="fr">France</SelectItem>
    </SelectGroup>
  </SelectContent>
</Select>
```

#### Checkbox

A styled checkbox component with proper accessibility.

**Import:**
```typescript
import { Checkbox } from '@/components/ui/checkbox';
```

**Usage Examples:**
```tsx
// Basic checkbox
<Checkbox id="terms" />

// With label
<div className="flex items-center space-x-2">
  <Checkbox id="terms" />
  <Label htmlFor="terms">Accept terms and conditions</Label>
</div>

// Controlled checkbox
<Checkbox
  checked={isChecked}
  onCheckedChange={setIsChecked}
/>
```

### Layout Components

#### Card

A flexible container component for grouping related content.

**Import:**
```typescript
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
```

**Usage Examples:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description goes here</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>

// Simple card
<Card className="p-6">
  <h3 className="font-semibold">Simple Card</h3>
  <p className="text-muted-foreground">Content without header/footer</p>
</Card>
```

#### Separator

A visual separator for dividing content sections.

**Import:**
```typescript
import { Separator } from '@/components/ui/separator';
```

**Usage Examples:**
```tsx
// Horizontal separator
<div>
  <p>Content above</p>
  <Separator className="my-4" />
  <p>Content below</p>
</div>

// Vertical separator
<div className="flex items-center space-x-4">
  <span>Left content</span>
  <Separator orientation="vertical" className="h-4" />
  <span>Right content</span>
</div>
```

#### Tabs

A tabbed interface component for organizing content.

**Import:**
```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
```

**Usage Examples:**
```tsx
<Tabs defaultValue="tab1" className="w-[400px]">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">
    <p>Content for tab 1</p>
  </TabsContent>
  <TabsContent value="tab2">
    <p>Content for tab 2</p>
  </TabsContent>
</Tabs>
```

### Feedback Components

#### Alert

A component for displaying important messages to users.

**Import:**
```typescript
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
```

**Usage Examples:**
```tsx
// Default alert
<Alert>
  <AlertTitle>Heads up!</AlertTitle>
  <AlertDescription>
    You can add components to your app using the cli.
  </AlertDescription>
</Alert>

// Destructive alert
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Your session has expired. Please log in again.
  </AlertDescription>
</Alert>
```

**Variants:**
- `default` - Standard informational alert
- `destructive` - Error or warning alert

#### Dialog

A modal dialog component for overlays and confirmations.

**Import:**
```typescript
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
```

**Usage Examples:**
```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">Edit Profile</Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>Edit profile</DialogTitle>
      <DialogDescription>
        Make changes to your profile here. Click save when you're done.
      </DialogDescription>
    </DialogHeader>
    <div className="grid gap-4 py-4">
      {/* Form content */}
    </div>
    <DialogFooter>
      <Button type="submit">Save changes</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Badge

A small component for displaying status or category information.

**Import:**
```typescript
import { Badge } from '@/components/ui/badge';
```

**Usage Examples:**
```tsx
// Default badge
<Badge>New</Badge>

// Secondary badge
<Badge variant="secondary">In Progress</Badge>

// Destructive badge
<Badge variant="destructive">Error</Badge>

// Outline badge
<Badge variant="outline">Draft</Badge>
```

### Form Components

#### Form

A comprehensive form system built on React Hook Form.

**Import:**
```typescript
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
```

**Usage Examples:**
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const formSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
});

function ProfileForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="shadcn" {...field} />
              </FormControl>
              <FormDescription>
                This is your public display name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

#### Label

A styled label component for form fields.

**Import:**
```typescript
import { Label } from '@/components/ui/label';
```

**Usage Examples:**
```tsx
// Basic label
<Label htmlFor="email">Email</Label>

// With input
<div className="grid w-full max-w-sm items-center gap-1.5">
  <Label htmlFor="email">Email</Label>
  <Input type="email" id="email" placeholder="Email" />
</div>
```

## Styling and Customization

### CSS Variables

The components use CSS variables for theming:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 222.2 84% 4.9%;
  --muted: 210 40% 96%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96%;
  --accent-foreground: 222.2 84% 4.9%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}
```

### Custom Styling

Components can be customized using the `className` prop:

```tsx
// Custom button styling
<Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
  Gradient Button
</Button>

// Custom card styling
<Card className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
  Custom Card
</Card>
```

### Responsive Design

All components are responsive by default. Use Tailwind's responsive prefixes:

```tsx
<Button className="w-full sm:w-auto">
  Responsive Button
</Button>

<Card className="p-4 sm:p-6 lg:p-8">
  Responsive Padding
</Card>
```

## Accessibility

All components follow WCAG 2.1 guidelines:

- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Screen Reader Support**: Proper ARIA labels and descriptions
- **Focus Management**: Visible focus indicators and logical tab order
- **Color Contrast**: Sufficient contrast ratios for all text
- **Semantic HTML**: Proper use of semantic elements

### Accessibility Examples

```tsx
// Proper form labeling
<div className="grid w-full max-w-sm items-center gap-1.5">
  <Label htmlFor="email">Email Address</Label>
  <Input 
    type="email" 
    id="email" 
    placeholder="Enter your email"
    aria-describedby="email-description"
    aria-invalid={hasError}
  />
  <p id="email-description" className="text-sm text-muted-foreground">
    We'll never share your email with anyone else.
  </p>
</div>

// Dialog with proper focus management
<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Action</DialogTitle>
      <DialogDescription>
        This action cannot be undone. Are you sure you want to continue?
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button variant="destructive">Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Best Practices

### Component Usage

1. **Use semantic HTML**: Choose the right component for the content
2. **Provide proper labels**: Always label form controls
3. **Handle loading states**: Show feedback during async operations
4. **Implement error states**: Provide clear error messages
5. **Consider mobile users**: Test on different screen sizes

### Performance

1. **Import only what you need**: Use specific imports
2. **Lazy load heavy components**: Use dynamic imports for large components
3. **Optimize images**: Use Next.js Image component
4. **Minimize re-renders**: Use React.memo and useMemo appropriately

### Testing

1. **Test accessibility**: Use automated accessibility testing tools
2. **Test keyboard navigation**: Ensure all functionality works with keyboard
3. **Test screen readers**: Verify screen reader compatibility
4. **Test responsive design**: Check on various screen sizes

## Related Documentation

- [Authentication Components](./auth-components.md) - Auth-specific components
- [Form Components](./form-components.md) - Form handling patterns
- [Design System](../styling/design-system.md) - Design tokens and guidelines
- [Accessibility Guide](../../development/coding-standards/accessibility.md) - Accessibility standards