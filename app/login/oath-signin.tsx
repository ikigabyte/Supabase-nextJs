"use client";

import { Button } from "@/components/ui/button";
import { Provider } from "@supabase/supabase-js";
// import { GoogleIcon } from "@/components/icons/google"
import { Chrome } from "lucide-react";
import { oAuthSignIn } from "./actions";

type OAuthProvider = {
  name: Provider;
  displayName: string;
  icon?: JSX.Element;
};

export function OAuthButtons() {
  const oAuthProviders: OAuthProvider[] = [
    {
      name: "google",
      displayName: "Google",
      icon: <Chrome className="size-4" />,
    },
  ];
  return (
    <>
      {oAuthProviders.map((provider) => (
        <Button
          key={provider.name}
          className="w-full flex items-center justify-center gap-2"
          variant="outline"
          onClick={async () => {
            console.log("Signing in with provider:", provider.name);
            oAuthSignIn(provider.name);
          }}
        >
          {provider.icon}
          Sign in with {provider.displayName}
        </Button>
      ))}
    </>
  );
}
