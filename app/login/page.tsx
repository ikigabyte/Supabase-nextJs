import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { emailLogin, signup } from "./actions";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { OAuthButtons } from "./oath-signin";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ message?: string | string[] | undefined }>;
}) {
  // Await and normalize searchParams.message
  const { message: rawMessage } = await searchParams;
  const message: string | undefined =
    rawMessage === undefined
      ? undefined
      : Array.isArray(rawMessage)
      ? rawMessage[0]
      : rawMessage;

    const supabase = await createClient();
     const {
       data: { user },
     } = await supabase.auth.getUser();
    if (user) {
      redirect("/toprint");
    };
  return (
    <section className="h-[calc(100vh-57px)] flex justify-center items-center">
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>Enter your email below to login to your account</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form id="login-form" className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="m@example.com" required />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input minLength={6} name="password" id="password" type="password" required />
            </div>
            {message && <div className="text-sm font-medium text-destructive">{message}</div>}
            <Button formAction={emailLogin} className="w-full">
              Sign In
            </Button>
          </form>
          <OAuthButtons />
          <div className="text-center text-sm">
            Don&apos;t have an account?{" "}
            <button formAction={signup} form="login-form" className="underline">
              Sign up
            </button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
