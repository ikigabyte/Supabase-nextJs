import AuthHeader from "@/components/auth-header";

export default function DatabaseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthHeader />
      <main className="flex flex-col items-center">{children}</main>
    </>
  );
}
