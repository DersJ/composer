import {
  createContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import NDK, {
  NDKNip07Signer,
  NDKEvent,
  NDKPrivateKeySigner,
  NDKUser,
} from "@nostr-dev-kit/ndk";
import { RELAYS } from "@/lib/utils";
import NDKCacheAdapterDexie from "@nostr-dev-kit/ndk-cache-dexie";

interface NDKContextType {
  ndk: NDK | null;
  loginWithKey: (privateKey: string | null, publicKey?: string) => void;
}

export const NDKContext = createContext<NDKContextType | undefined>(undefined);

interface NDKProviderProps {
  children: React.ReactNode;
}

export function NDKProvider({ children }: NDKProviderProps) {
  const [ndk, setNDK] = useState<NDK | null>(null);
  const dexieAdapter = new NDKCacheAdapterDexie({ dbName: "feedstr-cache" });

  // Shared function to check for NIP-65 relays and initialize NDK
  const initializeWithRelays = useCallback(
    async (ndkInstance: NDK, user: NDKUser) => {
      try {
        await ndkInstance.connect();

        // Look for NIP-65 relay list event
        const relayListEvents = await ndkInstance.fetchEvents({
          kinds: [10002],
          authors: [user.pubkey],
        });

        let userRelays: string[] = [];

        // Get the most recent NIP-65 event
        const relayList = Array.from(relayListEvents).sort(
          (a, b) => (b.created_at || 0) - (a.created_at || 0)
        )[0];

        if (relayList) {
          // Parse the relay list from the event tags
          userRelays = relayList.tags
            .filter((tag) => tag[0] === "r")
            .map((tag) => tag[1]);

          if (userRelays.length > 0) {
            // Create new NDK instance with user's relays
            const userNdkInstance = new NDK({
              signer: ndkInstance.signer,
              explicitRelayUrls: userRelays,
              cacheAdapter: dexieAdapter,
            });

            if (!userNdkInstance.activeUser) {
              userNdkInstance.activeUser = user;
            }

            await userNdkInstance.connect();
            setNDK(userNdkInstance);
            console.log("Connected using NIP-65 relays:", userRelays);
            return;
          }
        }

        // If no NIP-65 relays found, use the provided instance
        setNDK(ndkInstance);
        console.log("Connected using default relays:", RELAYS);
      } catch (error) {
        console.error("Error initializing NDK:", error);
        setNDK(ndkInstance); // Fallback to default instance
      }
    },
    []
  );

  // Initialize with NIP-07 signer
  useEffect(() => {
    const initNdk = async () => {
      const signer = new NDKNip07Signer();

      const ndkInstance = new NDK({
        signer,
        explicitRelayUrls: RELAYS,
        cacheAdapter: dexieAdapter,
      });

      try {
        const user = await signer.user();
        if (!user) {
          await ndkInstance.connect();
          setNDK(ndkInstance);
          return;
        }

        await initializeWithRelays(ndkInstance, user);
      } catch (error) {
        console.error("Error with NIP-07 initialization:", error);
      }
    };

    initNdk();
  }, [initializeWithRelays]);

  const loginWithKey = useCallback(
    async (privateKey: string | null, publicKey?: string) => {
      try {
        let ndkInstance: NDK;
        let user: NDKUser;

        if (privateKey) {
          // Create instance with private key signer
          const signer = new NDKPrivateKeySigner(privateKey);
          ndkInstance = new NDK({
            signer,
            explicitRelayUrls: RELAYS,
            cacheAdapter: dexieAdapter,
          });
          user = await signer.user();
        } else if (publicKey) {
          // Create read-only instance
          console.log("publicKey", publicKey);
          ndkInstance = new NDK({
            explicitRelayUrls: RELAYS,
            cacheAdapter: dexieAdapter,
          });
          user = new NDKUser({ pubkey: publicKey });
          ndkInstance.activeUser = user;
        } else {
          throw new Error("Either privateKey or publicKey must be provided");
        }

        await initializeWithRelays(ndkInstance, user);
      } catch (error) {
        console.error("Error logging in with key:", error);
      }
    },
    [initializeWithRelays]
  );

  const value = useMemo(
    () => ({
      ndk,
      loginWithKey,
    }),
    [ndk, loginWithKey]
  );

  return <NDKContext.Provider value={value}>{children}</NDKContext.Provider>;
}
