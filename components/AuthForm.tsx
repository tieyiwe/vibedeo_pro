"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { signIn } from "next-auth/react";
import { SparkIcon, SpinnerIcon } from "./Icons";

interface Fields {
  name?: string;
  email: string;
  password: string;
}

export function AuthForm({
  mode,
  googleEnabled,
  next,
}: {
  mode: "login" | "signup";
  googleEnabled: boolean;
  next: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [googlePending, setGooglePending] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Fields>();

  async function onSubmit(values: Fields) {
    setError(null);
    try {
      if (mode === "signup") {
        const response = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not create your account");
      }

      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });
      if (result?.error) throw new Error("Incorrect email or password");

      router.push(next);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong");
    }
  }

  return (
    <div className="w-full max-w-sm space-y-5">
      <Link href="/" className="flex items-center justify-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white">
          <SparkIcon className="h-5 w-5" />
        </span>
        <span className="text-xl font-semibold tracking-tight">Vibedeo</span>
      </Link>

      <div className="card p-6">
        <h1 className="text-lg font-semibold text-zinc-50">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {mode === "login"
            ? "Sign in to keep creating."
            : "20 free credits to start — no card needed."}
        </p>

        {googleEnabled && (
          <>
            <button
              onClick={() => {
                setGooglePending(true);
                void signIn("google", { callbackUrl: next });
              }}
              disabled={googlePending}
              className="btn-ghost mt-5 w-full"
            >
              {googlePending ? <SpinnerIcon className="h-4 w-4" /> : <GoogleMark />}
              Continue with Google
            </button>
            <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wide text-zinc-600">
              <span className="h-px flex-1 bg-ink-700" />
              or
              <span className="h-px flex-1 bg-ink-700" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className={googleEnabled ? "space-y-3" : "mt-5 space-y-3"}>
          {mode === "signup" && (
            <div>
              <label className="label" htmlFor="name">
                Name (optional)
              </label>
              <input id="name" className="field" autoComplete="name" {...register("name")} />
            </div>
          )}

          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="field"
              {...register("email", { required: "Email is required" })}
            />
            {errors.email && <p className="mt-1 text-xs text-rose-300">{errors.email.message}</p>}
          </div>

          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="field"
              {...register("password", {
                required: "Password is required",
                minLength: { value: 8, message: "At least 8 characters" },
              })}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-rose-300">{errors.password.message}</p>
            )}
          </div>

          {error && (
            <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? <SpinnerIcon className="h-4 w-4" /> : null}
            {mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-zinc-500">
        {mode === "login" ? (
          <>
            No account?{" "}
            <Link href="/signup" className="text-brand-300 hover:text-brand-200">
              Sign up free
            </Link>
          </>
        ) : (
          <>
            Already have one?{" "}
            <Link href="/login" className="text-brand-300 hover:text-brand-200">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 01-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0012 22z" />
      <path fill="#FBBC05" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 000 9.2L6.4 14z" />
      <path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 003.1 7.4L6.4 10c.8-2.3 3-4.1 5.6-4.1z" />
    </svg>
  );
}
