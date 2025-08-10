import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { nip19 } from "nostr-tools";
import { Loader2 } from "lucide-react";

interface LoginScreenProps {
  onLogin: (privateKey: string | null, publicKey?: string) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [keyInput, setKeyInput] = useState("");
  const [keyError, setKeyError] = useState("");
  const [hasNip07, setHasNip07] = useState(false);
  const [checkingNip07, setCheckingNip07] = useState(true);

  useEffect(() => {
    // Check for NIP-07 extension
    const checkNip07 = async () => {
      try {
        if (typeof window !== "undefined" && window.nostr) {
          setHasNip07(true);
        }
      } catch (error) {
        // NIP-07 not available
      }
      setCheckingNip07(false);
    };

    // Small delay to prevent flash
    const timer = setTimeout(checkNip07, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleKeySubmit = () => {
    setKeyError("");
    try {
      // Try to decode as nsec first
      if (keyInput.startsWith("nsec")) {
        const { data: privateKey } = nip19.decode(keyInput);
        onLogin(privateKey as string);
      }
      // Then try as npub
      else if (keyInput.startsWith("npub")) {
        const { data: publicKey } = nip19.decode(keyInput);
        onLogin(null, publicKey as string);
      } else {
        setKeyError("Please enter a valid nsec or npub key");
      }
    } catch (e) {
      setKeyError("Invalid key format");
    }
  };

  const handleExtensionLogin = () => {
    window.location.reload();
  };

  // Don't render anything while checking for NIP-07 to prevent flash
  if (checkingNip07) {
    return <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin" />
    </div>
  }

  // Don't show login screen if NIP-07 is available
  if (hasNip07) {
    return <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin" />
    </div>
  }

  return (
    <Card className="max-w-lg mx-auto mt-8">
      <CardHeader>
        <CardTitle>Connect to Nostr</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Connect using a Nostr extension or enter your key manually
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <Button
            onClick={handleExtensionLogin}
            variant="outline"
            className="w-full"
          >
            Connect with Extension
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Enter your nsec or npub (stored in memory, cleared on page reload)"
              value={keyInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setKeyInput(e.target.value)
              }
            />
            {keyError && <p className="text-sm text-red-500">{keyError}</p>}
            <Button
              onClick={handleKeySubmit}
              className="w-full"
              disabled={!keyInput}
            >
              Connect with Key
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}