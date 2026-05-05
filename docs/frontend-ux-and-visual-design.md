# PienoSmart Frontend UX And Visual Design

## Purpose

This document defines the current UX direction for the PienoSmart client application.

It exists to make frontend implementation decisions consistent across:

- nearby search
- station detail
- trip refuel planning
- vehicle profiles

The goal is to keep the app simple, professional, and trustworthy for drivers aged 18-60, while preserving a path from today’s Expo web MVP to a later real mobile application for iPhone and Android.

---

## Product Positioning

PienoSmart should not feel like:

- a coupon app
- a cluttered map experiment
- a playful “cheap fuel” toy

It should feel like:

- a premium mobility utility
- a trustworthy decision support tool
- a map-driven product that helps users decide where and when to refuel

The UI must support this promise:

- “best refueling decision, not just the cheapest station”

---

## Core UX Principles

## 1. Map First

The map is the main spatial decision surface.

This means:

- nearby search should visually prioritize the map
- route planning should visually prioritize the route map
- lists support decision-making, but should not overpower the map

Users should understand:

- where stations are
- how far they are
- whether they are on the way

before they read every detail.

## 2. Decision Before Data Density

The app should not dump raw data without hierarchy.

Every screen should make it obvious:

- what the best option is
- why it is recommended
- what the tradeoffs are

Examples:

- nearby search should show highlighted station recommendations
- trip planning should explain why a stop fits the route
- detail sheets should present trustworthy structured facts, not visual clutter

## 3. Trust Through Clarity

Trust is created by:

- legible layouts
- stable component behavior
- visible freshness indicators
- consistent terminology
- restrained visual styling

Trust is damaged by:

- excessive decorative UI
- too many rounded or playful elements
- hidden behavior
- inconsistent controls
- unexplained ranking

## 4. Accessibility And Reach

The design has to work well for users from 18 to 60 years old.

That means:

- high contrast
- large enough touch targets
- no dependency on complex gestures
- no tiny, low-contrast labels
- clear text hierarchy

---

## Design Philosophy

The frontend should feel:

- calm
- precise
- credible
- efficient

The visual system should be:

- low-noise
- structured
- sharp-lined rather than soft and bubbly

This means:

- low to medium corner radius
- clean panels
- subtle borders
- controlled use of color
- restrained shadow usage

---

## Visual Direction

## Color Palette

### Primary

- `#163A5F`

Used for:

- primary buttons
- key navigation emphasis
- selected app states
- map trust anchor elements

### Primary Dark

- `#102B46`

Used for:

- stronger headers
- dark sections
- contrast backgrounds

### Secondary Neutral

- `#4E6E81`

Used for:

- support elements
- muted state UI
- informational labels

### Accent Teal

- `#2F7A73`

Used for:

- confirmed/reliable supporting states
- selected secondary controls
- supportive highlights

### Warm Action Accent

- `#D98E3D`

Used sparingly for:

- important recommendation emphasis
- ranking emphasis
- route convenience indicators

This should not dominate the interface.

### Background

- `#F6F7F5`

Main application background.

### Surface

- `#FFFFFF`

Cards, sheets, inputs, and elevated surfaces.

### Border

- `#D7DADF`

Subtle panel and control boundaries.

### Text Primary

- `#1F2933`

### Text Secondary

- `#52606D`

### Freshness Colors

- fresh: `#2E7D5B`
- stale: `#A06A2C`
- unknown: neutral grey

## Why This Palette

This palette works because:

- deep blue communicates trust and seriousness
- muted teal supports modern mobility/tooling aesthetics
- warm accent adds emphasis without turning the UI into a discount app
- light neutral background keeps the interface clean and readable

---

## Typography

## Font Recommendation

Primary recommendation:

- `IBM Plex Sans`

Why:

- professional
- legible
- less generic than default mobile sans stacks
- works well for both technical and consumer-facing products

Fallback acceptable alternatives:

- `Manrope`
- `Source Sans 3`

## Type Scale

- page title: `24-28`
- section heading: `18-20`
- card title: `15-17`
- body: `13-15`
- metadata/caption: `11-12`

## Typography Rules

- strong titles, compact supporting text
- avoid oversized marketing copy on operational screens
- avoid long paragraphs inside cards
- align prices and metrics cleanly for fast scanning

---

## Shape And Surface Rules

## Corners

Rounded borders should be reduced compared to the current MVP styling.

Recommended radius scale:

- panels: `10-14`
- cards: `10-12`
- inputs: `8-10`
- chips: `999` only where chips are clearly acting as tags or segmented selectors

The system should no longer rely on very soft, large-radius containers everywhere.

## Borders

Prefer:

- subtle 1px borders
- clean section separation

Over:

- heavy shadows
- excessive glow

## Shadows

Use sparingly:

- only for selected cards, sheets, or important overlays

Avoid strong shadows on every component.

---

## Screen Guidelines

## Nearby Search Screen

### Goal

Help the user find the most convenient nearby station quickly and confidently.

### Layout

Recommended order:

1. compact header
2. search + filters panel
3. map
4. station list

### Behavior

- location should be based on geolocation or place search, never raw lat/lon
- map movement should update station results
- hovering or selecting a map station should synchronize with the list
- the list should explain the recommendation, not just show numbers

### Component Notes

- the map is primary
- the station list should occupy secondary but still important space
- station previews on hover should stay tiny and useful

## Station Detail

### Goal

Expose all important fuel price facts without breaking map context.

### Recommended interaction

- use modal or bottom-sheet presentation
- avoid forcing full-page navigation for normal detail inspection

### Content priority

1. station name and brand
2. address and location context
3. freshness state
4. complete price table
5. recommendation notes

## Trip Planner

### Goal

Turn route-based refueling into an understandable and actionable decision.

### Layout

1. source / destination inputs
2. profile or manual filters
3. route summary
4. route explanation block
5. route map
6. suggested stops list

### Key UX requirement

Trip planning must clearly answer:

- where should I stop?
- why there?
- how much detour is involved?
- when during the trip does it make sense?

### Recommendation language

Use understandable phrasing such as:

- `small detour from the route`
- `well timed stop along the trip`
- `competitive fuel price on this route`

Not abstract scoring jargon alone.

## Vehicle Profiles

### Goal

Make personalization feel useful, not bureaucratic.

### UX notes

- form should feel clean and lightweight
- one clear default profile
- explain that profiles influence nearby and route recommendations

---

## Interaction Rules

## Nearby Map Interaction

- map exploration must not be interrupted by unwanted recentering
- selected stations may highlight, but should not fight user movement
- marker hover should show tiny preview
- marker selection should sync with list state

## List Interaction

- hover or tap on list cards should highlight the related marker
- selection state must feel stable
- selected cards should use border emphasis, not visual chaos

## Detail Interaction

- opening detail should feel fast and lightweight
- close behavior should be obvious
- the user should always feel they are still in the nearby/trip decision flow

## Motion

Recommended timings:

- tap response: `120-160ms`
- sheet open/close: `180-220ms`
- marker/list selection transition: `120-180ms`

Animation should feel:

- precise
- subtle
- helpful

Not decorative.

---

## Component Recommendations

## Buttons

### Primary

- dark blue background
- white text
- low-radius rectangle

### Secondary

- white or neutral background
- subtle border
- dark text

### Avoid

- oversized pill buttons everywhere
- overly bright CTA colors

## Inputs

- full width
- label above
- visible border
- clear focus state

## Chips / Option Selectors

- okay to keep rounded
- must read as compact segmented choices
- use consistent spacing
- active state should be strong but restrained

## Station Cards

Each station card should show:

- station name
- brand/location
- main price
- freshness
- optional score
- concise reasons

Selected state:

- stronger border
- subtle tint
- minimal elevation if needed

## Map Markers

### User marker

- strong blue
- clearly distinct from station markers

### Station markers

- compact
- fuel-aware
- selected marker gets stronger outline

### Hover popup

Should contain:

- station name
- compact price rows
- maybe freshness if space allows

Keep it small.

---

## Trust Signals

To strengthen trust, the UI should consistently expose:

- freshness
- source recency
- route fit
- detour scale
- recommendation reasons

The user should never feel the app is making mysterious decisions.

That means:

- no hidden ranking logic
- no “magic best result” without explanation
- no visually exaggerated promotional treatment

---

## Accessibility Requirements

- minimum 44x44 touch targets
- clear visible focus/active states
- body text contrast at or above 4.5:1
- do not rely only on color for freshness or recommendation states
- labels must remain readable on smaller devices

---

## Responsive Layout Guidance

## Mobile

- map first
- list below
- details in modal/bottom sheet
- compact stacked controls

## Tablet / wide web

- map left
- list right
- maintain same visual language

The information architecture should stay the same across form factors even if the layout changes.

---

## Implementation Priorities

This design direction should be implemented in this order:

1. introduce shared design tokens
2. tighten border radius and spacing system
3. apply the new palette consistently
4. standardize typography
5. refactor nearby screen into final map-first treatment
6. refactor trip planner to match the same design system
7. normalize profile/detail screens

---

## Design Tokens To Introduce

Suggested token groups:

- colors
- spacing
- radius
- typography
- elevation
- semantic states

Suggested token file targets:

- `frontend/theme/colors.ts`
- `frontend/theme/spacing.ts`
- `frontend/theme/typography.ts`
- `frontend/theme/radius.ts`

---

## Non-Goals

This document does not define:

- final branding/logo
- final onboarding/auth flows
- final notification UX
- route history UX

It is specifically the UX reference for the operational refueling product surfaces.

---

## Summary

PienoSmart’s frontend should feel like:

- a trustworthy navigation utility
- a premium decision-support tool
- a map-centered product with clear recommendations

The interface should optimize for:

- confidence
- clarity
- speed of decision

Not visual novelty.
