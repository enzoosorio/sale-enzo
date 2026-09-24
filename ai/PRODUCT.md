# PRODUCT.md — Product Vision & UX Philosophy

> Defining what **sale-enzo** is, who it's for, and how it should feel.

---

## Product Identity

### What is sale-enzo?

A **curated second-hand e-commerce platform** with AI-powered semantic search. Think of it as a modern thrift store experience — where finding the perfect item is intuitive, visual, and delightful.

### What it is NOT

- ❌ Not a marketplace (no third-party sellers)
- ❌ Not a generic e-commerce template
- ❌ Not a chatbot-first experience (search bar is primary)

### Core Differentiator

Traditional e-commerce: Users filter through categories and attributes.
sale-enzo: Users describe what they want in natural language, and the system understands intent.

> "Show me something for a summer wedding" → Returns appropriate dresses, suits, accessories

---

## Target Users

### Primary Persona: The Intentional Shopper

- Age: 22-40
- Values: Sustainability, unique finds, quality over quantity
- Behavior: Knows what vibe they want, not necessarily the exact item
- Pain point: Traditional filters don't capture style or occasion

### Secondary Persona: The Deal Hunter

- Looking for specific items at good prices
- Uses traditional filters + price sorting
- Appreciates condition transparency

---

## UX Philosophy

### 1. Search-First, Filter-Second

The search bar is the hero. Users should instinctively reach for it.

```
┌────────────────────────────────────────────────────────────────┐
│  🔍  What are you looking for?                                 │
│                                                                │
│  Try: "casual jacket for fall" or "vintage denim"              │
└────────────────────────────────────────────────────────────────┘
```

AI search results appear as an **overlay** on the product grid — not a new page. This keeps the user oriented and allows easy dismissal.

### 2. Animation as Feedback

Animations aren't decoration — they communicate state changes and guide attention.

| Interaction | Animation |
|-------------|-----------|
| Page load | Products fade in with stagger |
| Filter change | Grid items shuffle smoothly |
| AI search | Results slide up from bottom |
| Add to cart | Item flies to cart icon |
| Hover | Subtle scale + shadow lift |
| Dynamic stuff loading | Lazy loading + Skeletons as Suspense Fallback -- React Suspense|

I wish I can add:
Page Transitions between /products and /products:id. This would be a game-changer if I reach to apply this animation correctly, without compromising neither performance nor other capability.
As Astro (framework) allows their developers integrate the PageTransitions, I'd like to do that to have a smooth transitions between slots, not a complex animation with a lot of new shapes, and synchronizing everything with GSAP, no, just "repositioning" the "image" slot, to it's new parent container in the dynamic route, and then all the other properties as the price, title, and status. (for example)


**Rule**: If an animation doesn't serve communication, remove it.

### 3. Mobile-Native Design

Designed mobile-first, enhanced for desktop.

- Touch-friendly filter chips
- Swipeable product galleries
- Bottom sheet for AI search on mobile
- Thumb-zone aware button placement

### 4. Progressive Disclosure

Don't overwhelm. Show what's needed, reveal on demand.

```
Category Panel State Machine:
1. Categories (top-level)
2. → Select → Subcategories appear
3. → Select → All filters appear (size, color, price, condition)
```

### 5. Transparency Builds Trust

Second-hand requires trust. Be explicit about:
- **Condition**: Excellent, Good, Fair (with photos)
- **Measurements**: When relevant
- **Defects**: Visible in photos, described honestly
- **Return policy**: Clear and fair

---

## Visual Design Language

### Aesthetic Direction

**Clean minimalism with warmth**

- White space is a feature, not empty space
- Muted accent colors (earth tones, soft blues)
- Product photos are the color — UI stays neutral
- Typography: Modern sans-serif, generous line height

### Color Palette

```
Background:   #FAFAFA (warm white)
Surface:      #FFFFFF
Text Primary: #1A1A1A
Text Muted:   #6B7280
Accent:       #3B82F6 (blue for actions)
Success:      #10B981
Warning:      #F59E0B
Error:        #EF4444
```

### Component Style

- Rounded corners (8px default, 12px for cards)
- Subtle shadows for depth (no harsh borders)
- Consistent 4px/8px spacing grid
- Icons: Lucide (consistent stroke width)

---

## Feature Priorities

### Phase 1: Core (Now)

| Feature | Priority | Status |
|---------|----------|--------|
| Product catalog browse | P0 | ✅ Built |
| Category navigation | P0 | ✅ Built |
| Filter system (URL-based) | P0 | ✅ Built |
| Product detail page | P0 | ✅ Built |
| Admin: Product management | P0 | ✅ Built |
| Favorites / Wishlist | P1 | 🔄 In progress |
| Shopping cart | P1 | 🔄 In progress |

### Phase 2: AI Search

| Feature | Priority | Status |
|---------|----------|--------|
| Qdrant microservice setup | P0 | 📋 Planned |
| Semantic search endpoint | P0 | 📋 Planned |
| Search bar integration | P0 | 📋 Planned |
| Search results overlay | P1 | 📋 Planned |
| Metadata enrichment | P1 | 📋 Planned |

### Phase 3: Checkout & Orders

| Feature | Priority | Status |
|---------|----------|--------|
| Checkout flow | P0 | 📋 Planned |
| Order management | P0 | 📋 Planned |
| Order history (user) | P1 | 📋 Planned |
| Payment integration | P1 | 📋 Planned |
| Agentic sales assistant bot | P1 | 📋 Planned |

### Phase 4: Future (Deferred)

| Feature | Priority |
|---------|----------|
| User preference learning | P2 | --> RAG with GRAPHRAG, building knowledge graphs or clusters to create communities, etc.
| Similar items recommendations | P2 |
| Size matching AI | P3 |
| Trades view with it's own route -- Trading products in my website | P3 |
| Raffle of some products with real-time interactivity | P4 |

---

## Success Metrics

### Portfolio Project Goals

This is a **showcase project** for technical skills. Success means:

1. **Code Quality**: Clean architecture that demonstrates senior-level thinking
2. **UX Polish**: Animations and interactions that feel premium
3. **AI Integration**: Semantic search that actually works and impresses
4. **Full Stack**: End-to-end implementation (frontend → backend → AI)

### If This Were Production

| Metric | Target |
|--------|--------|
| Search relevance | >80% of top-5 results are relevant |
| Page load (LCP) | <2.5s |
| Animation jank | 0 dropped frames at 60fps |
| Cart conversion | Measurable path from search → cart |

---

## Content Strategy

### Product Data Quality

Each product needs:
- **Title**: Descriptive, includes brand if notable
- **Description**: 2-3 sentences, mentions key features
- **Condition**: Standardized (Excellent/Good/Fair)
- **Category**: Properly hierarchical
- **Tags**: 3-5 relevant tags for discoverability
- **Metadata**: Occasion, style, sport (when relevant)
- **Photos**: Minimum 3 (front, back, detail)

### Example Product Profile

```yaml
title: "Nike Dri-FIT Football Jersey"
description: "Authentic NFL-style jersey with moisture-wicking fabric. Perfect for game day or casual wear."
condition: "Excellent"
category: "Clothing > Sports > Football"
tags: ["nike", "jersey", "football", "sports", "athletic"]
metadata:
  sport: "fútbol americano"
  occasion: "casual, game day"
  style: "athletic"
  brand: "Nike"
```

This data feeds both traditional filters AND semantic search.

---

## Non-Functional Requirements

### Performance

| Metric | Requirement |
|--------|-------------|
| First Contentful Paint | <1.5s |
| Largest Contentful Paint | <2.5s |
| Time to Interactive | <3.5s |
| Search response time | <500ms |
| Animation framerate | 60fps minimum |

### Accessibility

- WCAG 2.1 AA compliance minimum
- Keyboard navigation for all interactions
- Screen reader friendly product cards
- Sufficient color contrast
- Focus indicators visible

### SEO

- Server-rendered product pages
- Proper meta tags and Open Graph
- Structured data (JSON-LD) for products
- Clean URL structure (/products/[slug])

---

## Competitive Landscape

### What We Learn From

| Platform | Takeaway |
|----------|----------|
| Depop | Social, visual-first browsing |
| Poshmark | Condition transparency |
| ThredUp | Category organization |
| The RealReal | Luxury feel, quality photography |
| Vinted | Simple, no-nonsense UX |

### Our Position

sale-enzo sits between casual marketplaces (Depop/Poshmark) and premium consignment (The RealReal). We offer:
- Curated quality (not user-generated chaos)
- AI-powered discovery (not just filters)
- Transparent pricing (no negotiation)
- Premium UX (animations, polish)
