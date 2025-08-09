import { useEffect } from "react";
import { useState } from "react";
import { useNDK } from "./useNDK";
import { NDKUser } from "@nostr-dev-kit/ndk";

export function useActiveUser() {
  const { ndk } = useNDK();
  const [activeUser, setActiveUser] = useState<NDKUser | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [followedPubkeys, setFollowedPubkeys] = useState<string[]>([]);

  useEffect(() => {
    if (activeUser && ndk) {
      ndk
        .fetchEvents({
          kinds: [0, 3],
          authors: [activeUser.pubkey],
        })
        .then((events) => {
          events.forEach((event) => {
            if (event.kind === 0) {
              setProfile(JSON.parse(event.content));
            } else if (event.kind === 3) {
              const pubkeys = event.tags
                .filter((tag) => tag[0] === "p")
                .map((tag) => tag[1]);
              setFollowedPubkeys(pubkeys);
            }
          });
        });
    }
  }, [activeUser]);
  useEffect(() => {
    if (ndk?.activeUser) {
      setActiveUser(ndk.activeUser);
    }
  }, [ndk]);

  return { activeUser, profile, followedPubkeys };
}
