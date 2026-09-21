import Link from "next/link";
import { getCurrentUserId } from "@/lib/auth";
import { STYLE_LIST } from "@/lib/stylePresets";
import { CREDIT_PACKS, formatPrice } from "@/lib/stripe.client";
import { SparkIcon } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const signedIn = Boolean(await getCurrentUserId());

  return (
    <div className="mx-auto max-w-6xl px-5 py-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white">
            <SparkIcon className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Vibedeo</span>
        </Link>
        <nav className="flex items-center gap-2">
          {signedIn ? (
            <Link href="/generate" className="btn-primary">
              Open studio
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-subtle">
                Sign in
              </Link>
              <Link href="/signup" className="btn-primary">
                Start free
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="py-20 text-center">
        <span className="chip mx-auto border-brand-500/40 text-brand-200">
          Powered by Seedance · a fraction of Runway / Pika / Sora pricing
        </span>
        <h1 className="mx-auto mt-5 max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-tight text-zinc-50 sm:text-6xl">
          AI video with characters that
          <span className="bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">
            {" "}
            actually stay consistent
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-zinc-400">
          Generate cinematic or Pixar-style 3D clips from a sentence or an image. Save a
          character once and reuse it across every scene — same face, same outfit, every time.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href={signedIn ? "/generate" : "/signup"} className="btn-primary px-6 py-3 text-base">
            {signedIn ? "Create a video" : "Start with 20 free credits"}
          </Link>
          <Link href="/pricing" className="btn-ghost px-6 py-3 text-base">
            See pricing
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STYLE_LIST.map((preset) => (
          <div key={preset.id} className="card p-5">
            <h3 className="text-sm font-semibold text-zinc-100">{preset.label}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{preset.description}</p>
            <p className="mt-3 text-xs italic text-zinc-600">&ldquo;{preset.example}&rdquo;</p>
          </div>
        ))}
      </section>

      <section className="mt-20 grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Character consistency",
            body: "Upload a reference or describe your character. Claude writes a locked visual description that is reused verbatim in every prompt, alongside a locked seed.",
          },
          {
            title: "Pixar-style 3D, first class",
            body: "A tuned style preset for rounded expressive characters, soft global illumination and vivid colour — not just photoreal footage.",
          },
          {
            title: "Prompt enhancer",
            body: "Turn a rough idea into a detailed, cinematic prompt before you spend a credit. You review the rewrite first.",
          },
        ].map((feature) => (
          <div key={feature.title} className="card p-5">
            <h3 className="text-base font-semibold text-zinc-100">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{feature.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-20 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-50">Simple credit pricing</h2>
        <p className="mt-2 text-sm text-zinc-400">
          1 credit per second at 720p. Failed renders are refunded automatically.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {CREDIT_PACKS.map((pack) => (
            <div key={pack.id} className="card px-5 py-4 text-left">
              <p className="text-sm font-medium text-zinc-200">{pack.name}</p>
              <p className="text-xs text-zinc-500">{pack.credits.toLocaleString()} credits</p>
              <p className="mt-1 text-lg font-semibold text-zinc-50">
                {formatPrice(pack.priceCents)}
                {pack.mode === "subscription" && (
                  <span className="text-xs font-normal text-zinc-500">/mo</span>
                )}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-24 border-t border-ink-700 py-8 text-center text-xs text-zinc-600">
        Vibedeo · built on Next.js, Replit Postgres + Object Storage, Seedance and Claude.
      </footer>
    </div>
  );
}
