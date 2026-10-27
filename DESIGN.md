---
name: Makanlah
description: Malaysian food discovery and community website
colors:
  cream: "#FEF3E2"
  gold: "#F4AE52"
  orange: "#D4621A"
  ink: "#2A1A0E"
  muted: "#71583F"
  line: "#D9C8B1"
  soft: "#F7E9D3"
  field: "#FFFAF2"
  danger: "#8A2919"
typography:
  display:
    fontFamily: "Bricolage Grotesque"
    fontWeight: 800
    fontSize: "88px"
    lineHeight: 1.12
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Bricolage Grotesque"
    fontWeight: 750
    fontSize: "38px"
    lineHeight: 1.13
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Bricolage Grotesque"
    fontWeight: 750
    fontSize: "22px"
    lineHeight: 1.13
    letterSpacing: "-0.025em"
  body:
    fontFamily: "DM Sans"
    fontWeight: 400
    fontSize: "15px"
    lineHeight: 1.55
  body-mobile:
    fontFamily: "DM Sans"
    fontWeight: 400
    fontSize: "14px"
    lineHeight: 1.55
  label:
    fontFamily: "DM Sans"
    fontWeight: 650
    fontSize: "14px"
    lineHeight: 1.55
rounded:
  control: "12px"
  photo: "16px"
  feature: "24px"
spacing:
  small: "8px"
  medium: "16px"
  group: "24px"
  section: "64px"
  desktop-gutter: "80px"
  mobile-gutter: "20px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.cream}"
    rounded: "{rounded.control}"
    height: "48px"
    padding: "12px 22px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "48px"
  button-accent:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "48px"
---

# Makanlah design system

## Overview

**Creative North Star: "A food journal and city atlas"**

A warm food journal and city atlas for discovering Malaysian food and sharing food experiences. Preserve the user's four-color palette, typography and photographic Figma composition. This document records the implemented responsive website, including public discovery, community, posting, merchant QR ordering and admin workspaces.

Figma provenance: file `7L5g6fhIpqer5AFKRnocfY`, public page `5:2`. The implementation used saved construction sources, the actual photo bank and browser captures because live MCP access hit its Starter-plan quota. Earlier Figma text-sizing defects are historical evidence, not rules to reproduce in flowing web layout.

**Key Characteristics:** real food photography, cream canvas, confident brown type, restrained orange emphasis, gold discovery surfaces, generous separation between sections and compact task controls.

## Colors

Cream is the main canvas. Deep brown carries text, controls, and footers. Gold groups food journeys, useful prompts, and selected actions. Burnt orange emphasizes large display words and the liked heart state. Keep small body text in brown on cream or gold: cream on orange is unsuitable for small text.

The implemented neutral extensions are muted brown `#71583F`, divider `#D9C8B1`, soft surface `#F7E9D3` and field surface `#FFFAF2`; errors use `#8A2919`. Status pills use `#DBE4CB`/`#344320` for active/completed and `#F1D8C7`/`#7C2B17` for rejected/suspended. These are semantic status treatments, not replacements for the four brand colors.

## Typography

Use self-hosted Bricolage Grotesque Variable for display/headings and DM Sans Variable for body/controls. Home display is 88px at desktop, then 76px, 65px and 64px at the responsive breakpoints; its line height is 1.12 desktop and 1.04 mobile. General headings use 750 weight, 1.13 line height and -0.025em tracking. Section headings are normally 38px; titles 22px; body is 15px desktop and 14px mobile, with 1.55 line height. Buttons use 14px/650. Supporting labels generally use 11–14px. Small map and status annotations are denser; do not copy these sizes into body text. Let multiline copy determine its own height.

## Layout

The content container is at most 1280px. At the 1440px target it has 80px gutters; gutters become 40px below 1200px, 28px below 960px, and 20px below 640px. The mobile target is 390px. Home flows from a two-column hero to a stacked hero. Food grids use four/three columns on desktop and two on mobile. Community posts and merchant/admin task surfaces collapse into a single column as needed. Mobile filters start collapsed; tables and tab rows scroll within their own containers.

Navigation is 88px desktop, 76px below 960px, and 72px on mobile. Mobile bottom navigation reserves 65px plus the device safe-area inset. Food-feed height fills the remaining viewport and uses vertical scroll snap. Normal sections use 48px/32px padding with 64px for larger separations; mobile sections use 35px/15px.

## Elevation & Depth

Use tonal surfaces and subtle brown borders. Photography supplies most visual depth. Avoid stacking shadows and borders on food cards.

Popovers use `0 10px 34px #2A1A0E24`; location panels use `0 12px 38px #2A1A0E26`; map pins use `0 4px 12px #2A1A0E26`; the drawer uses `-15px 0 50px #2A1A0E29`. Food cards remain flat. The feed's dark gradient exists to keep text readable over dynamic media.

## Shapes

Controls use 12px corners, photos 16px, and large hero photography 24px. Pills are reserved for filters and small map pins.

## Components

Buttons are brown/cream, transparent with a subtle brown border, or gold/brown; minimum height 48px, 12px radius, 12px/22px padding. Hover darkens the primary to `#4C3020`; pressed controls shift down 1px. Disabled controls use 0.48 opacity. Focus rings are 3px orange with 4px offset; fields use a brown focus border and 1px focus shadow.

Food cards lead with photography and keep information outside the image; bookmarks occupy the upper right. Search fields are flexible rows with a 64px desktop height. Chips use a pill shape, brown selected state and restrained borders. Native form elements carry the same field surface and radius.

Navigation and role gates connect real routes. The feed combines snap-scrolling media, play/pause, mute, likes, comments, saves and sharing; clips pause offscreen and in the background. Comment/report drawers use native modal dialogs. Merchant workspaces provide listings, menus, QR tables and orders; admin surfaces provide moderation and account controls.

State transitions use 0.16s ease for buttons; food hover scale uses 0.35s `cubic-bezier(.2,.7,.3,1)`; toast transitions use 0.2s ease. Reduced-motion preferences remove animations/transitions and hover scaling. Selection, caret, focus and scrollbar colors use the brand palette.

## Do's and Don'ts

Do use the credited food photography and preserve the selected palette, typography and flowing composition. Do credit Nextgen Tech in About Us and the footer. Do label seeded listings, reviews, prices, posts and the sample motion clip as examples; user-created data is real local application data. Keep partnership disclosure distinct from review credibility.

Don't add role eyebrows above headings or carry fixed Figma text heights into the web layout. Don't imply dietary certification, verified restaurants or provable review honesty. Don't claim cloud verification or deployment from local tests.

Implementation evidence: production build and 18 API integration tests passed; browser flows covered local photo/video posting, social persistence, geolocation, real OSM tiles and customer/merchant orders. The independent reviewer scored its two final fixes resolved and returned `ship` for those fixes. Cloud adapters remain unverified against real credentials. The documentation helper hit an account limit, so this factual source-based refresh was completed in the main thread.
