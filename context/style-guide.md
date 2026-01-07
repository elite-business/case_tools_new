# Enterprise UI Style Guide (2026)

## 1. Core Philosophy
* **Clarity over Visual Flair:** Prioritize functional density. Information should be scannable with zero "mystery meat" navigation.
* **AI-First Interactions:** Every input should support "Smart Paste" and "AI-Refinement" patterns.
* **Resilient Layouts:** All components must handle extreme data cases (e.g., 0 items vs. 10,000 items).

## 2. Design Tokens & Foundations
### Color & Contrast (WCAG 2.1 AAA)
* **Primary:** Deep Indigo (`#2B4C7E`) for trust and stability.
* **Surface:** Use a "Semantic Gray" scale. Backgrounds should use subtle elevation layers (L0: `#FFFFFF`, L1: `#F9FAFB`).
* **Status:** Use standardized semantical colors:
  - Success: Emerald 600
  - Warning: Amber 500
  - Danger: Rose 600
  - Info: Sky 600

### Typography
* **Font:** Inter Variable or SF Pro.
* **Scale:** Use a minor third scale. Body text: `14px` (Enterprise default). 
* **Hierarchy:** Bold headers, regular body, and medium weight for interactive labels.

## 3. Component Architecture
### Naming & Structure
* **Prefixing:** All internal library components use the `Base` prefix (e.g., `BaseButton.tsx`).
* **Composition:** Use the "Compound Component" pattern (e.g., `<Table.Header>`, `<Table.Row>`) to allow flexible layout injection.

### State & Feedback
* **Empty States:** Never show a blank screen. Use "Empty State Patterns" with a clear CTA.
* **Loading:** Use Skeleton screens for data-heavy views; use "Spinning Buttons" only for small action feedback.
* **Error Handling:** Form errors must be inline and vocalized by screen readers.



## 4. Technical Implementation (React + Tailwind)
### Tailwind Conventions
* Use **Utility-First** but group complex classes using `@apply` if repeated >3 times.
* **Responsive:** Use `sm:`, `md:`, `lg:`, and `xl:` breakpoints strictly for layout shifts, not just styling.

### TypeScript Strictness
* No `any`. Every component prop must have a defined `interface`.
* Use `ReadonlyArray` for props that shouldn't be mutated.

## 5. 2026 "Smart" Patterns
* **AI-Assistance:** Components like `SmartTextArea` should include a visual "AI is thinking" ghost state.
* **Data Provenance:** If data is AI-generated, mark it with a subtle "Sparkle" icon and a tooltip explaining the source.
* **Predictive Design:** High-usage actions should be visually prioritized using "Predictive Priority" (subtle glow or top-ranking in lists).

## 6. Accessibility (a11y)
* **Keyboard Focus:** High-visibility focus rings (2px solid primary).
* **ARIA:** Proper usage of `aria-label`, `aria-expanded`, and `aria-live` for dynamic content.