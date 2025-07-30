"use client";

import { Button } from "@/components/ui/button";
import { Provider } from "@supabase/supabase-js";
// import { GoogleIcon } from "@/components/icons/google"
import { Chrome } from "lucide-react";
// import { oAuthSignIn } from "./actions";
import { getBrowserClient } from "@/utils/supabase/client";

// type OAuthProvider = {
//   name: Provider;
//   displayName: string;
//   icon?: JSX.Element;
// };

function signInWithGoogle() {}

export function OAuthButtons() {
  // const oAuthProviders: OAuthProvider[] = [
  //   {
  //     name: "google",
  //     displayName: "Google",
  //     icon: <Chrome className="size-4" />,
  //   },
  // ];
  // return (
  //   <>
  //     {oAuthProviders.map((provider) => (
  //       <form
  //         key={provider.name} // ← unique key
  //         onSubmit={async (e) => {
  //           e.preventDefault();
  //           await oAuthSignIn(provider.name);
  //         }}
  //       >
  //         {/* explicit hidden input so provider.name is passed */}
  //         <input type="hidden" name="provider" value={provider.name} />
  //         <button type="submit">Sign in with {provider.displayName}</button>
  //       </form>
  //     ))}
  //   </>
  // );

  const signIn = async () => {
    const supabase = getBrowserClient();
    console.log("Signing in with Google");
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
        queryParams: {
          prompt: "select_account", // force account picker  [oai_citation:0‡Reddit](https://www.reddit.com/r/Supabase/comments/16nkfts/after_logout_when_i_click_on_sign_in_with_google/?utm_source=chatgpt.com)
          access_type: "offline", // if you need a refresh token
          include_granted_scopes: "true", // optional: retain previously granted scopes
        },
      },
    });
    console.log(supabase.auth);
  };
  return (
    <Button onClick={signIn} className="w-full">
      <Chrome className="mr-2 h-4 w-4" />
      Sign in with Google
    </Button>
  );
}
