import { NDKRelay, NDKRelayStatus } from "@nostr-dev-kit/ndk";
import { useNDK } from "hooks/useNDK";
import { useEffect, useState } from "react";

interface RelayInfo {
  url: string;
  status: "connected" | "disconnected";
}

export default function RelayStatus() {
  const { ndk } = useNDK();
  const [relays, setRelays] = useState<RelayInfo[]>([]);

  useEffect(() => {
    if (!ndk) return;

    const updateRelayStatus = () => {
      console.log("update relay status");
      console.log(ndk.pool.relays);
      const relayStatuses: RelayInfo[] = [];
      ndk.pool?.relays.forEach((relay: NDKRelay) => {
        relayStatuses.push({
          url: relay.url,
          status:
            relay?.connectivity?.status === NDKRelayStatus.CONNECTED
              ? "connected"
              : "disconnected",
        });
      });
      setRelays(relayStatuses);
    };

    // Initial status
    updateRelayStatus();

    // Update status when relays connect/disconnect
    const relayConnectHandler = () => updateRelayStatus();
    const relayDisconnectHandler = () => updateRelayStatus();

    ndk.pool?.on("relay:connect", relayConnectHandler);
    ndk.pool?.on("relay:disconnect", relayDisconnectHandler);

    return () => {
      ndk.pool?.removeListener("relay:connect", relayConnectHandler);
      ndk.pool?.removeListener("relay:disconnect", relayDisconnectHandler);
    };
  }, [ndk]);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Connected Relays</h3>
      <div className="space-y-1">
        {relays.map((relay) => (
          <div key={relay.url} className="flex items-center space-x-2 text-sm">
            <div
              className={`w-2 h-2 rounded-full ${
                relay.status === "connected" ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="truncate">{relay.url}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
