# NostrFeed - Context for Claude

## Project Overview

NostrFeed is a decentralized feed customization application built on Nostr that allows users to create personalized feed algorithms through a rule-based interface. Users can define weighted rules to customize their content feeds based on various criteria like content type, sources, and engagement patterns.

## Technology Stack

- **Frontend**: React 18.3.1 with TypeScript
- **Routing**: React Router DOM 7.1.5
- **Styling**: Tailwind CSS with shadcn/ui components
- **Nostr Integration**: NDK (Nostr Development Kit) 2.11.0 with Dexie caching
- **Build Tool**: Vite 5.4.10
- **Package Manager**: Yarn

## Key Features

1. **Feed Algorithm Builder** - Visual interface to create feed rules
2. **Real-time Feed Display** - Infinite scroll with weighted content
3. **Rule-based System** - Subject + Verb + Predicate + Time + Weight structure
4. **Nostr Integration** - Native nostr protocol support with NDK
5. **Profile & Note Views** - Individual note and profile pages
6. **Thread Support** - Nested comment viewing

## Project Structure

```
src/
├── app/                     # Main application logic
│   ├── FeedBuilder.tsx      # Algorithm creation interface
│   ├── FeedDisplay.tsx      # Feed rendering with infinite scroll
│   ├── FeedManager.tsx      # Feed management components
│   ├── types.ts             # Core type definitions
│   └── pages/               # Route components
├── components/              # Reusable UI components
│   ├── Note.tsx             # Note display component
│   ├── NoteContent.tsx      # Note content parsing
│   ├── ui/                  # shadcn/ui components
│   └── atoms/molecules/organisms/ # Atomic design structure
├── contexts/                # React contexts
│   ├── FeedContext.tsx      # Feed state management
│   ├── FeedsContext.tsx     # Multiple feeds management
│   └── NDKContext.tsx       # Nostr connection context
├── hooks/                   # Custom React hooks
│   ├── useNDK.ts            # NDK connection hook
│   ├── useNote.ts           # Individual note fetching
│   └── useThread.ts         # Thread loading
└── lib/                     # Core business logic
    ├── rules.ts             # Rule processing and filter creation
    ├── FeedStateManager.ts  # Feed state management
    └── nostr.ts             # Nostr utilities
```

## Core Data Models

### FeedRule
```typescript
interface FeedRule {
  id: string;
  subject: "Posts" | "Pictures";
  verb: "posted" | "trending" | "commented" | "liked" | "interacted";
  predicate: "followers" | "nostr" | "tribe";
  timeRange: "1hr" | "4hr" | "12hr" | "24hr" | "7d";
  weight: number; // Must sum to 100% across all rules
}
```

### Feed
```typescript
interface Feed {
  id: string;
  name: string;
  rules: FeedRule[];
}
```

## Key Components

- **FeedBuilder** (`src/app/FeedBuilder.tsx:14-17`) - Main algorithm creation interface
- **FeedDisplay** (`src/app/FeedDisplay.tsx:14`) - Displays feed with infinite scroll
- **Note** (`src/components/Note.tsx`) - Individual note display component
- **createFilters** (`src/lib/rules.ts:106-114`) - Converts rules to NDK filters

## Development Commands

- `yarn dev` - Start development server
- `yarn build` - Build for production (runs TypeScript check)
- `yarn lint` - Run ESLint

## Current Implementation Status

- Basic feed algorithm builder (limited subjects/verbs/predicates enabled)
- Feed display with infinite scroll
- Note threading and detail views
- Profile pages
- NDK integration with caching
- Scroll position tracking

## Architecture Notes

- Frontend-only implementation using NDK for Nostr connectivity
- Rules stored as Nostr replaceable events (kind 30000+)
- Built-in NDK caching for performance
- Atomic design pattern for components
- TypeScript throughout for type safety

## Feed Algorithm System

The core system converts high-level rules into Nostr filters:
1. Rules define what content to fetch (subject + verb + predicate)
2. Time ranges limit content age
3. Weights determine content mixing ratios
4. Multiple filters run in parallel and results are merged

The `createFilters` function in `src/lib/rules.ts` handles the conversion from rules to NDK filters for different content types and engagement patterns.