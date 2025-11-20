# UI Fixes Priority List - iOS-Inspired Design System

## Design System Implementation Status

✅ **Completed:**
- Design tokens (colors, spacing, typography, elevation)
- Base CSS styles with iOS-inspired typography
- Component library CSS (buttons, cards, inputs, tables, badges, etc.)
- Responsive breakpoints and mobile optimizations
- Accessibility improvements (focus states, reduced motion)

## Priority Fixes by Route

### 1. Dashboard (User & Admin) - HIGH PRIORITY

**Issues:**
- [ ] Card alignment inconsistent (needs 24px outer gutter)
- [ ] Card spacing irregular (should be 16px between cards)
- [ ] Typography scale inconsistent (h1/h2 sizes vary)
- [ ] Small action buttons below 44px touch target
- [ ] Statistics cards need consistent padding (24px)
- [ ] Recent activity feed spacing too tight

**Fixes Applied:**
- ✅ Design tokens created for consistent spacing
- ✅ Card component styles with proper elevation
- ⏳ Need to update Dashboard components to use new tokens

**Next Steps:**
1. Update Dashboard.jsx to use new card styles
2. Ensure all cards have consistent 24px padding
3. Make all interactive elements minimum 44px height
4. Apply consistent typography scale

---

### 2. Products Page - HIGH PRIORITY

**Issues:**
- [ ] Grid too cramped (needs responsive 2/3/4 columns)
- [ ] Product cards inconsistent aspect ratios
- [ ] Filter chips inline on mobile (should be drawer)
- [ ] Card padding inconsistent (should be 16px)
- [ ] Product images not properly contained
- [ ] Price display alignment issues
- [ ] Action buttons too small

**Fixes Needed:**
1. Implement responsive grid: 1 col mobile, 2 tablet, 3-4 desktop
2. Add filter drawer component for mobile/tablet
3. Standardize card aspect ratio (16:9 or 4:3)
4. Ensure all buttons are 44px minimum
5. Add consistent card padding using tokens

---

### 3. Content Management (Admin) - FIXED ✅

**Issues Fixed:**
- ✅ Fixed `toUpperCase()` on undefined type
- ✅ Fixed `toLocaleString()` on undefined views
- ✅ Added null checks for status rendering
- ✅ Improved date formatting with error handling
- ✅ Added minimum touch targets for action buttons

**Remaining Issues:**
- [ ] Table row padding should be 12px vertical, 16px horizontal
- [ ] Table header needs better styling (uppercase, letter-spacing)
- [ ] Row hover states need subtle background change
- [ ] Action buttons need consistent spacing
- [ ] Table needs sticky header on scroll

**Next Steps:**
1. Apply table component styles from design system
2. Add sticky header functionality
3. Improve row hover states
4. Ensure consistent button spacing

---

### 4. My Purchases - MEDIUM PRIORITY

**Issues:**
- [ ] List items not grouped by date
- [ ] Receipt cards too compact
- [ ] Action buttons need 44px touch targets
- [ ] Spacing between items inconsistent
- [ ] Empty state missing

**Fixes Needed:**
1. Group purchases by date with section headers
2. Increase card padding to 16px
3. Add empty state component
4. Ensure all buttons meet touch target requirements

---

### 5. Favorites Page - MEDIUM PRIORITY

**Issues:**
- [ ] Missing empty state with CTA
- [ ] Grid/list toggle not persistent
- [ ] Card spacing inconsistent
- [ ] Remove buttons too small

**Fixes Needed:**
1. Add empty state component
2. Save view preference to localStorage
3. Standardize card spacing (16px gap)
4. Make remove buttons 44px minimum

---

### 6. My Courses - MEDIUM PRIORITY

**Issues:**
- [ ] Progress bars need better styling
- [ ] Module accordion spacing tight
- [ ] Course card thumbnails inconsistent size
- [ ] Spacing between cards should be 16px

**Fixes Needed:**
1. Style progress bars with iOS-inspired design
2. Add proper spacing in accordion (16px)
3. Standardize thumbnail sizes (16:9 ratio)
4. Apply consistent card spacing

---

### 7. Live Sessions - HIGH PRIORITY

**Issues:**
- [ ] Video area not properly sized
- [ ] Chat panel needs better styling
- [ ] Controls not accessible (below 44px)
- [ ] Participant list cramped
- [ ] Split view not responsive

**Fixes Needed:**
1. Implement proper split view layout
2. Make video area fluid, chat fixed width
3. Ensure all controls are 44px minimum
4. Improve participant list styling
5. Add mobile bottom sheet for controls

---

### 8. Chat - MEDIUM PRIORITY

**Issues:**
- [ ] Message alignment inconsistent
- [ ] Spacing between messages too tight (should be 10-12px)
- [ ] Composer height unstable
- [ ] Input field below 44px height
- [ ] Send button too small

**Fixes Needed:**
1. Standardize message spacing (12px gap)
2. Fix composer to stable height (48px)
3. Ensure input and buttons are 44px minimum
4. Improve message bubble styling

---

### 9. Discover Users / New Users / My Network - LOW PRIORITY

**Issues:**
- [ ] Follow buttons below 44px
- [ ] Avatar sizes inconsistent
- [ ] Card padding inconsistent
- [ ] Search input height below 44px

**Fixes Needed:**
1. Standardize avatar sizes (40px default)
2. Ensure all follow buttons are 44px minimum
3. Apply consistent card padding (16px)
4. Fix search input height

---

### 10. Notifications - MEDIUM PRIORITY

**Issues:**
- [ ] Not grouped by date
- [ ] List items too compact
- [ ] Quick action toggles missing
- [ ] Badge styling inconsistent

**Fixes Needed:**
1. Group notifications by date
2. Increase list item padding (16px)
3. Add quick action toggles
4. Standardize badge styling

---

### 11. Settings / Profile / Security / Account - MEDIUM PRIORITY

**Issues:**
- [ ] Two-column layout not implemented on desktop
- [ ] Form fields below 44px height
- [ ] Save/cancel buttons inconsistent styling
- [ ] Toggle switches need iOS styling

**Fixes Needed:**
1. Implement two-column layout (desktop)
2. Stack on mobile
3. Ensure form inputs are 44-48px height
4. Style toggles with iOS design
5. Standardize action buttons

---

### 12. Admin - User Management - HIGH PRIORITY

**Issues:**
- [ ] Data table needs server-side pagination
- [ ] Column pinning not implemented
- [ ] Bulk actions missing
- [ ] Table row selection not styled
- [ ] Filters need drawer on mobile

**Fixes Needed:**
1. Implement server-side pagination
2. Add column pinning functionality
3. Add bulk action header
4. Style selected rows
5. Add filter drawer for mobile

---

### 13. Admin - Analytics - MEDIUM PRIORITY

**Issues:**
- [ ] KPI cards need consistent styling
- [ ] Charts need better spacing
- [ ] Export CSV button missing
- [ ] Card padding inconsistent

**Fixes Needed:**
1. Apply consistent card styling
2. Add proper spacing between charts (24px)
3. Add export CSV functionality
4. Standardize card padding

---

### 14. Admin - Audit Logs - LOW PRIORITY

**Issues:**
- [ ] Table too compact
- [ ] Filters need date-range presets
- [ ] Row hover states missing

**Fixes Needed:**
1. Apply comfortable table variant
2. Add date-range quick presets
3. Add row hover states

---

## Component Library Status

### ✅ Created Components:
- Buttons (primary, secondary, ghost, destructive)
- Cards (default, compact, elevated)
- Inputs & Forms
- Badges & Tags
- Tables (compact, comfortable)
- Tabs
- Modals
- Avatars
- Lists
- Empty States

### ⏳ Needs Implementation:
- Filter Drawer
- Bottom Sheet (mobile modals)
- Search Component
- Pagination Component
- Skeleton Loaders
- Toast Notifications
- Tooltips
- Popovers
- Breadcrumbs
- Sidebar Navigation

---

## Accessibility Checklist

### ✅ Implemented:
- Focus states with visible outlines
- Reduced motion support
- Minimum touch targets (44px)
- Color contrast ratios defined

### ⏳ Needs Work:
- [ ] ARIA labels for all interactive elements
- [ ] Keyboard navigation for all components
- [ ] Screen reader testing
- [ ] Color contrast validation (aim for 4.5:1)
- [ ] Focus trap in modals

---

## Responsive Breakpoints

- **Mobile:** < 640px
- **Tablet:** 640px - 1023px
- **Desktop:** 1024px+
- **Wide:** 1280px+

### Mobile-Specific Fixes Needed:
- [ ] Bottom navigation for mobile
- [ ] Bottom sheet modals
- [ ] Filter drawers instead of inline
- [ ] Stack layouts instead of grids
- [ ] Touch-friendly spacing (16px minimum)

---

## Next Steps (Priority Order)

1. **Apply design tokens to existing components** (Week 1)
2. **Fix Dashboard spacing and alignment** (Week 1)
3. **Update Products page with responsive grid** (Week 1)
4. **Fix ContentManagement table styling** (Week 1)
5. **Implement filter drawer component** (Week 2)
6. **Update all forms to use new input styles** (Week 2)
7. **Fix Live Sessions split view** (Week 2)
8. **Add empty states to all pages** (Week 2)
9. **Implement bottom navigation for mobile** (Week 3)
10. **Add skeleton loaders** (Week 3)

---

## Design Token Usage Guide

### Spacing
```css
padding: var(--space-md);        /* 16px */
margin-bottom: var(--space-lg);  /* 24px */
gap: var(--space-sm);            /* 12px */
```

### Colors
```css
background: var(--bg-primary);
color: var(--text-primary);
border-color: var(--border-default);
```

### Typography
```css
font-size: var(--type-body);     /* 16px */
font-weight: var(--weight-medium);
line-height: var(--line-normal);
```

### Elevation
```css
box-shadow: var(--elev-1);  /* Subtle */
box-shadow: var(--elev-2);  /* Elevated */
```

### Border Radius
```css
border-radius: var(--radius-md);  /* 12px */
border-radius: var(--radius-lg);   /* 20px */
```

---

## Notes

- All spacing should align to 8px grid
- Minimum touch target: 44px × 44px
- Card padding: 16px (compact) or 24px (comfortable)
- Container padding: 16px mobile, 24px tablet, 32px desktop
- Transition duration: 100-300ms for interactions

