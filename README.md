## Overview

NostrFeed is a decentralized feed customization application that allows users to define personalized feed algorithms through a simple rule-based interface. Users can specify different content sources and weightings to create their ideal nostr content feed.

## Functional Specification

### Core Features

1. Feed Algorithm Builder
   - Users define feed rules using a structured format
   - Each rule consists of Subject, Verb, Predicate, Time Range, and Weight
   - Multiple rules can be combined with percentage weights
   - Weights must sum to 100%
2. Rule Components
   - Subjects: Posts, Pictures
   - Verbs: posted, trending, commented, liked, interacted
   - Predicates: followers, nostr, tribe
   - Time Ranges: 1hr, 4hr, 12hr, 24hr, 7d
   - Weight: Percentage slider (0-100)
3. Feed Display
   - Infinite scroll interface
   - Real-time updates
   - Displays notes according to algorithm weights
   - Shows interaction counts and user information

### Example Algorithms

1. "Traditional" Feed:
   - Posts posted by followers (60%)
   - Posts trending on nostr (20%)
   - Posts commented on by followers (20%)
2. "Discovery" Feed:
   - Posts liked by followers (40%)
   - Posts trending from tribe (30%)
   - Pictures liked by followers (30%)

## Technical Specification

### Architecture Overview

Initial implementation will be frontend-only using React and NDK (Nostr Development Kit), with provisions to add backend caching later.

### Technology Stack

1. Frontend:
   - React for UI
   - NDK for nostr connectivity
   - TypeScript for type safety
   - Tailwind CSS for styling
2. Data Storage:
   - Algorithm configurations stored as nostr replaceable events
   - NDK's built-in caching for performance
   - Local storage for user preferences

### Project Structure

1. Source Organization
   - /src/components: React components
   - /src/lib: Core logic and utilities
   - /src/hooks: Custom React hooks
   - /src/types: TypeScript definitions
2. Key Components
   - AlgorithmBuilder: Rule creation interface
     - RuleEditor: Individual rule editing
   - Feed: Content display and infinite scroll
     - NoteCard: Note display component
   - Note: Note detail view with comments
   - Profile: Read-only nostr profile page

### Data Models

1. Feed Rule
   - subject: Content type selector
   - verb: Action type
   - predicate: Scope of content
   - timeRange: Time window
   - weight: Percentage weighting
2. Feed Algorithm
   - rules: Array of feed rules
   - version: Schema version
   - name: Optional algorithm name
   - metadata: Additional configuration

### Core Systems

1. NDK Integration
   - NIP-07 Login
   - Handles relay connections
   - Manages subscriptions
   - Provides caching layer
   - Handles event verification
2. Feed Generation Engine
   - Translates rules into nostr filters
   - Executes weighted queries
   - Merges multiple result streams
   - Handles deduplication
3. Algorithm Storage
   - Stores configurations as kind:30000+ events
   - Handles versioning and updates
   - Manages user preferences

### Query System

1. Filter Generation
   - Converts high-level rules to nostr filters
   - Handles complex queries (e.g., liked posts)
   - Manages subscription grouping
2. Content Fetching
   - Parallel query execution
   - Smart relay selection
   - Result caching
   - Deduplication

### Performance Considerations

1. Frontend Optimization
   - Efficient subscription management
   - Request batching
   - Virtual scrolling for feed
   - Progressive loading
2. Caching Strategy
   - NDK's built-in caching
   - Browser local storage
   - Subscription grouping
   - Event deduplication

### Future Extensibility

1. Backend Integration
   - Prepared for optional backend addition
   - Caching layer interface
   - Analytics and metrics
   - Custom indexing
2. Feature Expansion
   - Additional rule types
   - Custom predicates
   - Advanced filtering
   - Algorithm sharing

## Security and Privacy

1. User Data
   - No private key handling
   - Public data only
   - Client-side processing
   - Transparent data flow
2. Event Verification
   - Signature validation
   - Content verification
   - Relay authentication
   - Rate limiting

## Development Phases

1. Phase 1: MVP
   - Basic algorithm builder
   - Simple feed display
   - Core query system
   - Essential caching
2. Phase 2: Enhancement
   - Advanced rules
   - Performance optimization
   - UI refinement
   - Community features
3. Phase 3: Scale
   - Backend integration
   - Advanced caching
   - Analytics
   - Custom indexing
