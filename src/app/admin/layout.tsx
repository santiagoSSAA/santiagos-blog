"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { LayoutDashboard, PenSquare, LogOut, Loader2, Film } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFFmpegStatus } from "@/lib/hooks/use-ffmpeg-status";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/new", label: "Nuevo Post", icon: PenSquare },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const ffmpegState = useFFmpegStatus();
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setAuthenticated(true);
      }
      setLoading(false);
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: unknown) => {
      setAuthenticated(!!session);
      setLoading(false);
      if (!session && pathname !== "/admin/login") {
        router.push("/admin/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, router, pathname]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!authenticated) {
    router.push("/admin/login");
    return null;
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950">
      <aside className="flex w-64 flex-col border-r border-zinc-200 bg-zinc-900 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex h-16 items-center gap-2 border-b border-zinc-800 px-6">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-lg font-semibold text-white">Admin</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-zinc-800 p-3 space-y-2">
          <div className="flex items-center gap-2.5 rounded-lg px-3 py-2 bg-zinc-800/50">
            <Film className="h-4 w-4 text-zinc-500 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    "h-1.5 w-1.5 rounded-full shrink-0",
                    ffmpegState.state === "ready" && "bg-emerald-500",
                    ffmpegState.state === "loading" && "bg-amber-500 animate-pulse",
                    ffmpegState.state === "error" && "bg-red-500",
                    ffmpegState.state === "idle" && "bg-zinc-600"
                  )}
                />
                <span className="text-xs font-medium text-zinc-400 truncate">
                  {ffmpegState.state === "idle" && "Compresor inactivo"}
                  {ffmpegState.state === "loading" && "Cargando compresor..."}
                  {ffmpegState.state === "ready" && "Compresor listo"}
                  {ffmpegState.state === "error" && "Compresor no disponible"}
                </span>
              </div>
              {ffmpegState.detail && ffmpegState.state === "loading" && (
                <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                  {ffmpegState.detail}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800/50 hover:text-zinc-200"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
