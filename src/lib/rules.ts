import { NDKFilter } from "@nostr-dev-kit/ndk";

export interface FeedRule {
  id: string;
  subject: "Posts" | "Pictures" | "Replies";
  verb: "posted" | "trending" | "commented" | "liked" | "interacted";
  predicate: "follows" | "nostr" | "tribe";
  timeRange: "1hr" | "4hr" | "12hr" | "24hr" | "7d";
  weight: number;
}

// Time range conversion
export const getTimeFromRange = (timeRange: string): number => {
  const now = Math.floor(Date.now() / 1000);
  const ranges: Record<string, number> = {
    "1hr": 3600,
    "4hr": 14400,
    "12hr": 43200,
    "24hr": 86400,
    "7d": 604800,
  };
  return now - (ranges[timeRange] || ranges["24hr"]);
};

// Helper function to handle trending content
const getTrendingFilter = (baseFilter: NDKFilter): NDKFilter => {
  // For trending content, we look at both the original posts and their reactions
  // to calculate a rough engagement score
  return {
    ...baseFilter,
    kinds: [1, 7, 6], // Include likes (7) and reposts (6)
    limit: baseFilter.limit ? baseFilter.limit * 3 : 60, // Fetch more to calculate trending
  };
};

// Helper function to handle liked content
const getLikedFilter = (
  baseFilter: NDKFilter,
  followedPubkeys?: string[]
): NDKFilter[] => {
  // First filter gets the reaction events from followers
  const reactionFilter: NDKFilter = {
    kinds: [7], // reaction events
    since: baseFilter.since,
    limit: baseFilter.limit ? baseFilter.limit * 2 : 40, // Get more reactions to aggregate
  };

  // Only get reactions from people we follow
  if (followedPubkeys && followedPubkeys.length > 0) {
    reactionFilter.authors = followedPubkeys;
  }

  return [reactionFilter];
};

// Helper function to handle commented content
const getCommentedFilter = (baseFilter: NDKFilter): NDKFilter[] => {
  return [
    {
      ...baseFilter,
      kinds: [1],
      "#e": [], // Events that are replies (have e tags)
    },
  ];
};

// Helper function to handle replies subject - gets all reply events
const getRepliesFilter = (baseFilter: NDKFilter): NDKFilter[] => {
  return [
    {
      ...baseFilter,
      kinds: [1],
      // Note: We can't use "#e": [] to get events WITH e-tags in NDK
      // Instead, we'll get all events and filter post-processing
      // The filtering will happen in the feed processing logic
    },
  ];
};

// Helper function to handle interacted content
const getInteractedFilter = (
  baseFilter: NDKFilter,
  followedPubkeys?: string[]
): NDKFilter[] => {
  const filters: NDKFilter[] = [];

  // Look for posts with reactions
  filters.push({
    ...baseFilter,
    kinds: [7],
    authors: followedPubkeys,
  });

  // Look for posts with replies
  filters.push({
    ...baseFilter,
    kinds: [1],
    "#e": [],
    authors: followedPubkeys,
  });

  // Look for reposts
  filters.push({
    ...baseFilter,
    kinds: [6],
    authors: followedPubkeys,
  });

  return filters;
};

export interface CreateFiltersOptions {
  followedPubkeys?: string[];
  tribeMembers?: string[];
  limit?: number;
  until?: number;
}

export function createFilters(
  rule: FeedRule,
  options: {
    followedPubkeys: string[];
    tribePubkeys?: string[];
    limit?: number;
    until?: number;
  }
): NDKFilter[] {
  console.log("createFilters options: ", options);
  const { followedPubkeys, tribePubkeys, limit, until } = options;
  const baseFilter: NDKFilter = {
    kinds: [1],
    limit,
    until,
    since: rule.timeRange ? getTimeFromRange(rule.timeRange) : undefined,
  };

  if (rule.predicate === "follows") {
    return [
      {
        ...baseFilter,
        authors: followedPubkeys,
      },
    ];
  } else if (rule.predicate === "tribe") {
    return [
      {
        ...baseFilter,
        authors: tribePubkeys ? Array.from(tribePubkeys) : followedPubkeys,
      },
    ];
  }

  // Handle subject-specific modifications
  if (rule.subject === "Pictures") {
    baseFilter["#t"] = ["image"];
  }
  
  // For Replies subject, we'll handle it in the verb switch below
  // For Posts subject, we'll add post-processing to filter out replies

  // Handle verb-specific modifications and return appropriate filters
  switch (rule.verb) {
    case "trending":
      if (rule.subject === "Replies") {
        return getRepliesFilter(getTrendingFilter(baseFilter));
      }
      return [getTrendingFilter(baseFilter)];
    case "posted":
      if (rule.subject === "Replies") {
        return getRepliesFilter(baseFilter);
      }
      return [baseFilter];
    case "commented":
      return getCommentedFilter(baseFilter);
    case "liked":
      if (rule.subject === "Replies") {
        // For liked replies, we need to get reactions to reply events
        return getLikedFilter(baseFilter, followedPubkeys);
      }
      return getLikedFilter(baseFilter, followedPubkeys);
    case "interacted":
      if (rule.subject === "Replies") {
        return getRepliesFilter(getInteractedFilter(baseFilter, followedPubkeys)[0]);
      }
      return getInteractedFilter(baseFilter, followedPubkeys);
    default:
      if (rule.subject === "Replies") {
        return getRepliesFilter(baseFilter);
      }
      return [baseFilter];
  }
}

// Scoring function for trending content
export interface EventScore {
  eventId: string;
  score: number;
  timestamp: number;
}

export const calculateTrendingScore = (
  likes: number,
  reposts: number,
  replies: number,
  ageInHours: number
): number => {
  // Decay factor: older posts get less weight
  const decay = 1 / Math.pow(ageInHours + 2, 1.8);

  // Weighted sum of interactions
  const score =
    (likes * 1 + // Base weight for likes
      reposts * 2 + // Reposts weighted more heavily
      replies * 1.5) * // Comments weighted in between
    decay;

  return score;
};

// Helper to check if an event matches our filter criteria
export const matchesFilter = (
  event: { kind: number; tags: string[][] },
  filter: NDKFilter
): boolean => {
  // Check kinds
  if (filter.kinds && !filter.kinds.includes(event.kind)) return false;

  // Check tags
  for (const [key, values] of Object.entries(filter)) {
    if (key.startsWith("#")) {
      const tagName = key.slice(1);
      const eventTags = event.tags.filter((tag) => tag[0] === tagName);
      const typedValues = values as string[];
      if (
        typedValues.length > 0 &&
        !eventTags.some((tag) => typedValues.includes(tag[1]))
      ) {
        return false;
      }
    }
  }

  return true;
};

// Helper functions to determine if an event is a post or reply
export const isReply = (event: { tags: string[][] }): boolean => {
  return event.tags.some(tag => tag[0] === 'e');
};

export const isPost = (event: { tags: string[][] }): boolean => {
  return !isReply(event);
};

// Filter events based on subject type (Posts vs Replies)
export const filterEventsBySubject = (
  events: { tags: string[][] }[],
  subject: "Posts" | "Pictures" | "Replies"
): { tags: string[][] }[] => {
  if (subject === "Replies") {
    return events.filter(isReply);
  } else if (subject === "Posts") {
    return events.filter(isPost);
  }
  // For Pictures, no additional filtering needed beyond what's in the filter
  return events;
};
