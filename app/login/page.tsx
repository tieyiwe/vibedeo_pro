import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { optionalEnv } from "@/lib/env";
import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await getCurrentUserId()) redirect("/generate");
  const { next } = await searchParams;

  return (
    <div className="grid min-h-screen place-items-center px-5 py-12">
      <AuthForm
        mode="login"
        next={next ?? "/generate"}
        googleEnabled={Boolean(optionalEnv("GOOGLE_CLIENT_ID") && optionalEnv("GOOGLE_CLIENT_SECRET"))}
      />
    </div>
  );
}
