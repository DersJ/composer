import NDK, { NDKEvent, NDKSubscription } from "@nostr-dev-kit/ndk";
import { FeedRule, getTimeFromRange } from "@/lib/rules";
import { createFilters, filterEventsBySubject } from "@/lib/rules";

export class FeedSubscriptionManager {
  private ndk: NDK;
  private activeSubscriptions: NDKSubscription[] = [];

  constructor(ndk: NDK) {
    this.ndk = ndk;
  }


  subscribe(
    rules: FeedRule[],
    options: {
      followedPubkeys: string[];
      currentUntil: number;
      batchSize: number;
      onEvent: (event: NDKEvent) => void;
      onComplete: () => void;
    }
  ) {
    // console.debug("[FeedSubscriptionManager] Subscribing with rules:", {
    //   ruleCount: rules.length,
    //   followedPubkeys: options.followedPubkeys.length,
    //   until: new Date(options.currentUntil * 1000),
    // });

    const { followedPubkeys, currentUntil, batchSize, onEvent, onComplete } =
      options;

    rules.forEach((rule) => {
      if (rule.verb === "liked") {
        this.subscribeLikedNotes(rule, {
          followedPubkeys,
          currentUntil,
          batchSize,
          onEvent,
          onComplete,
        });
      } else {
        this.subscribeDirectNotes(rule, {
          followedPubkeys,
          currentUntil,
          batchSize,
          onEvent,
          onComplete,
        });
      }
    });
  }

  private subscribeLikedNotes(
    rule: FeedRule,
    options: {
      followedPubkeys: string[];
      currentUntil: number;
      batchSize: number;
      onEvent: (event: NDKEvent) => void;
      onComplete: () => void;
    }
  ) {
    const { followedPubkeys, currentUntil, batchSize, onEvent, onComplete } =
      options;

    // First subscribe to like events
    const likeSub = this.ndk.subscribe({
      kinds: [7],
      authors: followedPubkeys,
      since: rule.timeRange ? getTimeFromRange(rule.timeRange) : undefined,
      until: currentUntil,
      limit: batchSize,
    });

    const likedEventIds = new Set<string>();

    likeSub.on("event", (event: NDKEvent) => {
      const likedEventId = event.tags.find((t) => t[0] === "e")?.[1];
      if (likedEventId) {
        likedEventIds.add(likedEventId);
        // console.debug(
        //   `[FeedSubscriptionManager] Received like event for ${likedEventId.slice(0, 8)}`
        // );
        onEvent(event);
      }
    });

    likeSub.on("eose", () => {
      // console.debug(
      //   `[FeedSubscriptionManager] Like subscription EOSE. Found ${likedEventIds.size} liked events`
      // );

      if (likedEventIds.size === 0) {
        onComplete();
        return;
      }

      // console.debug("[FeedSubscriptionManager] Subscribing to liked notes");
      // Then subscribe to the liked notes
      const noteSub = this.ndk.subscribe({
        kinds: [1],
        ids: Array.from(likedEventIds),
      });

      noteSub.on("event", (event) => {
        onEvent(event);
      });
      noteSub.on("eose", () => {
        console.debug(
          "[FeedSubscriptionManager] Liked notes subscription EOSE"
        );
        onComplete();
      });
      this.activeSubscriptions.push(noteSub);
    });

    this.activeSubscriptions.push(likeSub);
  }

  private subscribeDirectNotes(
    rule: FeedRule, 
    options: {
      followedPubkeys: string[];
      currentUntil: number;
      batchSize: number;
      onEvent: (event: NDKEvent) => void;
      onComplete: () => void;
    }
  ) {
    const filters = createFilters(rule, {
      followedPubkeys: options.followedPubkeys,
      limit: options.batchSize,
      until: options.currentUntil,
    });

    // console.debug(
    //   "[FeedSubscriptionManager] Setting up direct notes subscription:",
    //   {
    //     filterCount: filters.length,
    //     firstFilter: filters[0],
    //   }
    // );

    filters.forEach((filter) => {
      const sub = this.ndk.subscribe(filter);
      sub.on("event", (event) => {
        // console.debug(
        //   `[FeedSubscriptionManager] Received direct note ${event.id.slice(0, 8)}`
        // );
        
        // Filter events based on the rule's subject (Posts vs Replies)
        const filteredEvents = filterEventsBySubject([event], rule.subject);
        if (filteredEvents.length > 0) {
          options.onEvent(event);
        }
      });
      sub.on("eose", () => {
        // console.debug(
        //   "[FeedSubscriptionManager] Direct notes subscription EOSE"
        // );
        options.onComplete();
      });
      this.activeSubscriptions.push(sub);
    });
  }

  cleanup() {
    // console.debug(
    //   `[FeedSubscriptionManager] Cleaning up ${this.activeSubscriptions.length} subscriptions`
    // );
    this.activeSubscriptions.forEach((sub) => sub.stop());
    this.activeSubscriptions = [];
  }

  unsubscribeAll() {
    // console.debug(
    //   "[FeedSubscriptionManager] Unsubscribing from all subscriptions"
    // );
    this.activeSubscriptions.forEach((sub) => sub.stop());
    this.activeSubscriptions = [];
  }
}
