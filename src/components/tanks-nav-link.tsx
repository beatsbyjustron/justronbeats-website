"use client";

import { useEffect, type MouseEvent, type ReactNode } from "react";

const LOGO = "/tanks/brand/lockup-transparent.png";

function makeCurtain(visible: boolean) {
  const el = document.createElement("div");
  el.dataset.jtCurtain = "1";
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = `position:fixed;inset:0;z-index:9999;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;transition:opacity .5s ease;opacity:${visible ? 1 : 0}`;
  el.innerHTML = `<img src="${LOGO}" alt="" style="width:min(560px,80vw);height:auto;transition:transform .5s ease,opacity .5s ease;transform:scale(${visible ? 1 : 0.94});opacity:${visible ? 1 : 0}">`;
  document.body.appendChild(el);
  return el;
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function TanksNavLink({
  className,
  children = "Tanks",
  tabIndex,
}: {
  className?: string;
  children?: ReactNode;
  tabIndex?: number;
}) {
  useEffect(() => {
    // Warm the game so it opens instantly.
    const prefetch = document.createElement("link");
    prefetch.rel = "prefetch";
    prefetch.href = "/tanks/index.html";
    document.head.appendChild(prefetch);
    // Load the logo now so the fade into the game shows it right away.
    const logo = new Image();
    logo.src = LOGO;

    // Coming back from the game: fade the store in from the black title card.
    let exitAt = 0;
    try {
      exitAt = Number(sessionStorage.getItem("jt_exit") || 0);
      sessionStorage.removeItem("jt_exit");
    } catch {}
    if (exitAt && Date.now() - exitAt < 5000 && !reducedMotion()) {
      const curtain = makeCurtain(true);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          curtain.style.opacity = "0";
          setTimeout(() => curtain.remove(), 600);
        })
      );
    }

    // Back button from the game restores this page from cache: clear the curtain.
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) document.querySelectorAll("[data-jt-curtain]").forEach((n) => n.remove());
    };
    window.addEventListener("pageshow", onShow);
    return () => {
      prefetch.remove();
      window.removeEventListener("pageshow", onShow);
    };
  }, []);

  function go(e: MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (reducedMotion()) return;
    e.preventDefault();
    const curtain = makeCurtain(false);
    const title = curtain.firstElementChild as HTMLElement;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        curtain.style.opacity = "1";
        title.style.opacity = "1";
        title.style.transform = "scale(1)";
      })
    );
    setTimeout(() => {
      window.location.href = "/tanks";
    }, 650);
  }

  return (
    <a href="/tanks" onClick={go} className={className} tabIndex={tabIndex}>
      {children}
    </a>
  );
}
