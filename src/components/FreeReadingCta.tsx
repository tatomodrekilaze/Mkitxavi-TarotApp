import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AuthPanel } from "@/components/AuthPanel";
import { useApp } from "@/context/AppContext";

interface Props {
  className?: string;
  children: ReactNode;
}

/** Opens AuthPanel when signed out; goes home chat when signed in. */
export function FreeReadingCta({ className, children }: Props) {
  const { authenticated } = useApp();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (!authenticated || !authOpen) return;
    setAuthOpen(false);
    void navigate({ to: "/" });
  }, [authenticated, authOpen, navigate]);

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          if (authenticated) {
            void navigate({ to: "/" });
            return;
          }
          setAuthOpen(true);
        }}
      >
        {children}
      </button>
      <AuthPanel open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
