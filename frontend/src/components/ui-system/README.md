# UI System - Loading Components

This document outlines the loading system implemented in the Case Management frontend application.

## Loading Components Overview

### 1. LoadingSpinner Component
A reusable loading spinner with multiple configurations:

```tsx
import { LoadingSpinner } from '@/components/ui-system';

// Basic spinner
<LoadingSpinner />

// Large spinner with message
<LoadingSpinner size="lg" message="Loading data..." />

// Fullscreen loading
<LoadingSpinner fullscreen showCard message="Initializing application..." />

// Centered in container
<LoadingSpinner centered showCard message="Processing request..." />
```

### 2. CSS Utility Classes
Added to `design-system.css` for consistent loading layouts:

- `.loading-center` - Centers content within a container (min-height: 200px)
- `.loading-fullscreen` - Centers content in full viewport
- `.loading-overlay` - Fixed overlay covering entire screen
- `.loading-card` - Styled card container for loading content

### 3. Global Loading Provider
Uses the LoadingProvider for application-wide loading states:

```tsx
import { useLoading } from '@/components/providers/LoadingProvider';

function MyComponent() {
  const { setLoading } = useLoading();
  
  const handleAsyncOperation = async () => {
    setLoading('myKey', true, 'Processing...', 0);
    // ... async operation
    setLoading('myKey', false);
  };
}
```

### 4. Button Loading States
Buttons include built-in loading states:

```tsx
import { Button } from '@/components/ui-system';

<Button loading={isSubmitting}>
  Submit Form
</Button>
```

## Implementation Details

### Centering Strategy
All loading components use flexbox for reliable centering:
- `display: flex`
- `align-items: center` (vertical centering)
- `justify-content: center` (horizontal centering)

### Dark Mode Support
All loading components support dark mode via CSS variables and theme data attributes.

### Accessibility
- Loading states include appropriate ARIA attributes
- Sufficient color contrast for visibility
- Non-distracting animations

### Performance
- CSS animations for smooth performance
- Minimal DOM manipulation
- Efficient re-renders with React hooks

## Usage Guidelines

1. **Use Ant Design loading for forms and tables** - They have excellent built-in loading states
2. **Use LoadingSpinner for custom components** - When you need specific styling or behavior
3. **Use utility classes for quick implementations** - When you need simple centering
4. **Use LoadingProvider for global states** - For operations affecting the entire app

## Files Modified/Created

1. `/components/ui-system/LoadingSpinner.tsx` - New reusable component
2. `/components/ui-system/Button.tsx` - Enhanced spinner positioning
3. `/styles/design-system.css` - Added utility classes and improved spinner
4. `/app/page.tsx` - Enhanced with loading card
5. `/app/login/layout.tsx` - Enhanced with loading card
6. `/components/providers/LoadingProvider.tsx` - Updated to use utility classes