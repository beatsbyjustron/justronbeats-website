"use client";

import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";

type AuthContextValue = {
  ready: boolean;
  enabled: boolean;
  email: string | null;
  favoriteIds: Set<string>;
  isFavorite: (beatId: string) => boolean;
  toggleFavorite: (beatId: string) => void;
  openSignIn: (reason?: string) => void;
  signOut: () => Promise<void>;
  authFetch: (input: string, init?: RequestInit) => Promise<Response>;
  refresh: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [modalReason, setModalReason] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setReady(true);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  tokenRef.current = session?.access_token ?? null;

  const authFetch = useCallback((input: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    if (tokenRef.current) headers.set("Authorization", `Bearer ${tokenRef.current}`);
    if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    return fetch(input, { ...init, headers });
  }, []);

  useEffect(() => {
    if (!session) {
      setFavoriteIds(new Set());
      return;
    }
    let active = true;
    void authFetch("/api/account")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { favoriteIds?: string[] } | null) => {
        if (active && data?.favoriteIds) setFavoriteIds(new Set(data.favoriteIds));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [session, authFetch, version]);

  const openSignIn = useCallback((reason?: string) => setModalReason(reason ?? ""), []);

  const toggleFavorite = useCallback(
    (beatId: string) => {
      if (!session) {
        openSignIn("Sign in to save the beats you love. It takes one email, no password.");
        return;
      }
      const saved = !favoriteIds.has(beatId);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (saved) next.add(beatId);
        else next.delete(beatId);
        return next;
      });
      void authFetch("/api/account/favorites", { method: "POST", body: JSON.stringify({ beatId, saved }) }).then((res) => {
        if (!res.ok) {
          setFavoriteIds((prev) => {
            const next = new Set(prev);
            if (saved) next.delete(beatId);
            else next.add(beatId);
            return next;
          });
        }
      });
    },
    [session, favoriteIds, authFetch, openSignIn]
  );

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
  }, [supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      enabled: !!supabase,
      email: session?.user?.email ?? null,
      favoriteIds,
      isFavorite: (id: string) => favoriteIds.has(id),
      toggleFavorite,
      openSignIn,
      signOut,
      authFetch,
      refresh: () => setVersion((v) => v + 1)
    }),
    [ready, supabase, session, favoriteIds, toggleFavorite, openSignIn, signOut, authFetch]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {modalReason !== null && <SignInModal reason={modalReason} onClose={() => setModalReason(null)} />}
    </AuthContext.Provider>
  );
}

export function SignInForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [marketing, setMarketing] = useState(true);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email.");
      return;
    }
    setState("sending");
    try {
      const res = await fetch("/api/auth/email-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, marketing, next: window.location.pathname === "/account" ? "/account" : window.location.pathname })
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Couldn't send the email. Try again.");
        setState("idle");
        return;
      }
      setState("sent");
    } catch {
      setError("Couldn't send the email. Try again.");
      setState("idle");
    }
  };

  if (state === "sent") {
    return (
      <div className="space-y-2 text-center">
        <p className="text-lg font-semibold text-zinc-100">Check your email</p>
        <p className="text-sm text-zinc-400">
          We sent a sign-in link to <span className="text-zinc-200">{email.trim()}</span>. Open it on this device. It works for 1 hour.
        </p>
        <button type="button" onClick={() => setState("idle")} className="text-xs text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline">
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className={compact ? "flex flex-col gap-2 sm:flex-row" : "flex flex-col gap-2"}>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="min-w-0 flex-1 rounded-full border border-zinc-700 bg-black px-4 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-lime-300/70"
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="rounded-full bg-gradient-to-r from-emerald-400 via-lime-300 to-yellow-300 px-5 py-2.5 text-sm font-bold text-zinc-900 shadow-lg shadow-emerald-500/20 transition hover:scale-[1.02] disabled:opacity-60"
        >
          {state === "sending" ? "Sending..." : "Email me a sign-in link"}
        </button>
      </div>
      <label className="flex cursor-pointer items-start gap-2 text-xs text-zinc-400">
        <input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} className="mt-0.5 accent-lime-300" />
        <span>Email me beat discounts and new drops. Unsubscribe anytime from your account.</span>
      </label>
      {!!error && <p className="text-xs text-amber-400">{error}</p>}
    </form>
  );
}

function SignInModal({ reason, onClose }: { reason: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sign in"
        className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl shadow-black/60"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-zinc-100">Sign in to JustronBeats</p>
            <p className="mt-1 text-sm text-zinc-400">{reason || "Save beats, see your purchases and get first dibs on discounts."}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:border-zinc-500">
            ✕
          </button>
        </div>
        <SignInForm />
      </div>
    </div>
  );
}
