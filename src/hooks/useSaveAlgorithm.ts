import { FeedRule } from "app/types";
import { useNDK } from "./useNDK";
import { FEED_DEF_KIND } from "@/lib/utils";
import { NDKEvent } from "@nostr-dev-kit/ndk";

export const useSaveAlgorithm = () => {
  const { ndk } = useNDK();

  if (!ndk || !ndk.activeUser?.pubkey) {
    return async () => {};
  }

  return async (rules: FeedRule[], name: string = "New Feed") => {
    console.log("saving algorithm", rules, name);
    const event = new NDKEvent(ndk);
    event.kind = FEED_DEF_KIND;
    event.content = JSON.stringify({
      version: 1,
      name,
      rules,
    });

    event.tags = [["d", "feedstr"]];
    const published = await event.publish();
    console.log("published", published);
  };
};

export const useDeleteAlgorithm = () => {
  const { ndk } = useNDK();

  if (!ndk || !ndk.activeUser?.pubkey) {
    return async () => {};
  }

  return async (id: string) => {
    const event = new NDKEvent(ndk);
  };
};
