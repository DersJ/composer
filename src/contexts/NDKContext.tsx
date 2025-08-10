import {
  createContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import NDK, {
  NDKNip07Signer,
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
        console.log('[NDK] initializeWithRelays - connecting to relays...');
        await ndkInstance.connect();
        console.log('[NDK] initializeWithRelays - connected successfully');

        // Look for NIP-65 relay list event
        console.log('[NDK] Fetching NIP-65 relay list for user:', user.pubkey);
        const relayListEvents = await ndkInstance.fetchEvents({
          kinds: [10002],
          authors: [user.pubkey],
        });
        console.log('[NDK] Found', relayListEvents.size, 'NIP-65 events');

        let userRelays: string[] = [];

        // Get the most recent NIP-65 event
        const relayList = Array.from(relayListEvents).sort(
          (a, b) => (b.created_at || 0) - (a.created_at || 0)
        )[0];

        if (relayList) {
          console.log('[NDK] Processing NIP-65 relay list event');
          // Parse the relay list from the event tags
          userRelays = relayList.tags
            .filter((tag) => tag[0] === "r")
            .map((tag) => tag[1]);
          console.log('[NDK] Extracted user relays from NIP-65:', userRelays);

          if (userRelays.length > 0) {
            console.log('[NDK] Creating new NDK instance with user relays');
            // Create new NDK instance with user's relays
            const userNdkInstance = new NDK({
              signer: ndkInstance.signer,
              explicitRelayUrls: userRelays,
              cacheAdapter: dexieAdapter,
            });

            if (!userNdkInstance.activeUser) {
              userNdkInstance.activeUser = user;
            }

            try {
              console.log('[NDK] Connecting to user relays with 10s timeout...');
              // Add a timeout to prevent hanging
              await userNdkInstance.connect(3000);
              console.log('[NDK] Connected to user relays, setting as active NDK');
              setNDK(userNdkInstance);
              console.log("[NDK] Connected using NIP-65 relays:", userRelays);
              return;
            } catch (error) {
              console.warn('[NDK] Failed to connect to user relays, falling back to default:', error);
              // Fall through to use default relays
            }
          }
        } else {
          console.log('[NDK] No NIP-65 relay list found');
        }

        // If no NIP-65 relays found, use the provided instance
        console.log('[NDK] Using default relays, setting NDK instance');
        setNDK(ndkInstance);
        console.log("[NDK] Connected using default relays:", RELAYS);
      } catch (error) {
        console.error("[NDK] Error initializing NDK:", error);
        console.log('[NDK] Setting fallback NDK instance');
        setNDK(ndkInstance); // Fallback to default instance
      }
    },
    []
  );

  // Initialize with NIP-07 signer
  useEffect(() => {
    const initNdk = async () => {
      console.log('[NDK] Starting NIP-07 initialization...');
      console.log('[NDK] Checking for window.nostr:', !!window.nostr);

      const signer = new NDKNip07Signer();
      console.log('[NDK] Created NDKNip07Signer');

      const ndkInstance = new NDK({
        signer,
        explicitRelayUrls: RELAYS,
        cacheAdapter: dexieAdapter,
      });
      console.log('[NDK] Created NDK instance with relays:', RELAYS);

      try {
        console.log('[NDK] Attempting to get user from signer...');
        const user = await signer.user();
        console.log('[NDK] Signer.user() result:', user?.pubkey ? `User found: ${user.pubkey}` : 'No user found');

        if (!user) {
          console.log('[NDK] No user from signer, connecting without user...');
          await ndkInstance.connect();
          console.log('[NDK] Connected without user, setting NDK instance');
          setNDK(ndkInstance);
          return;
        }

        console.log('[NDK] User found, initializing with relays...');
        await initializeWithRelays(ndkInstance, user);
        console.log('[NDK] Successfully initialized with user and relays');
      } catch (error) {
        console.error('[NDK] Error with NIP-07 initialization:', error);
        console.log('[NDK] Will still try to set NDK instance as fallback');
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
