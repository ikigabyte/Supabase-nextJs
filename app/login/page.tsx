import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { emailLogin, signup } from "./actions";
import { redirect } from "next/navigation";
import { getServerClient } from "@/utils/supabase/server";
import { OAuthButtons } from "./oath-signin";

import Form from "next/form";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ message?: string | string[] | undefined }>;
}) {
  // Await and normalize searchParams.message
  const normalize = (v?: string | string[] | undefined): string | undefined => {
    if (v === undefined) return undefined;
    return Array.isArray(v) ? v[0] : v;
  };
  const message = normalize((await searchParams).message);
  // console.log("Login page message:", message);
  // const error = normalize((await searchParams).error);
  // console.log("Login page error:", error);
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/toprint");
  }
  return (
    <section className="h-[calc(100vh-57px)] flex justify-center items-center">
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Login</CardTitle>
          <CardDescription className="text-center">
            Enter your Stickerbeat Email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Form action={emailLogin} formMethod="POST" className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            {/* <LoginErrors /> */}
            {/* regular submit button now */}
            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </Form>
          <OAuthButtons />
          {message && <div className="text-sm text-destructive text-center">{message}</div>}
          {/* <Form action={signup} formMethod="POST" className="flex justify-center">
            <Button type="submit" className="w-full">
              Sign Up
            </Button>
          </Form> */}
        </CardContent>
      </Card>
    </section>
  );
}
