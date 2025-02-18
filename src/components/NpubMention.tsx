import { NDKUser } from "@nostr-dev-kit/ndk";
import { useNDK } from "hooks/useNDK";
import { useState } from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const NpubMention = ({
  npub,
  preloadedProfiles,
}: {
  npub: string;
  preloadedProfiles?: Map<string, NDKUser>;
}) => {
  const navigate = useNavigate();
  const { ndk } = useNDK();
  const [user, setUser] = useState<NDKUser | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      let user = preloadedProfiles?.get(npub);

      if (!user) {
        user = await ndk?.getUser({ npub });
        if (user) {
          const profile = await user.fetchProfile();
          if (profile) {
            user.profile = profile;
          }
        }
      }
      if (user) {
        setUser(user);
      }
    };

    fetchUser();
  }, [preloadedProfiles, npub]);

  return (
    <a
      key={npub}
      className="text-purple-700 cursor-pointer hover:text-blue-700"
      onClick={() => {
        navigate(`/${npub}`);
      }}
    >
      @{user?.profile?.name || npub.slice(0, 8) + "..."}{" "}
    </a>
  );
};
