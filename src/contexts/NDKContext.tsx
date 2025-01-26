import { createContext } from "react";
import NDK from "@nostr-dev-kit/ndk";
import { RELAYS } from "@/lib/utils";

interface NDKContextType {
  ndk: NDK | null;
}

export const NDKContext = createContext<NDKContextType | undefined>(undefined);

interface NDKProviderProps {
  children: React.ReactNode;
}

export const NDKProvider: React.FC<NDKProviderProps> = ({ children }) => {
  const ndk = new NDK({
    explicitRelayUrls: RELAYS,
  });

  // Connect to relays when the provider mounts
  ndk.connect();

  return <NDKContext.Provider value={{ ndk }}>{children}</NDKContext.Provider>;
};
