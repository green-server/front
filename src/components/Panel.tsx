import { useEffect, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";

export function Panel({
  title,
  back,
  escape = true,
  children,
}: {
  title: string;
  back?: { to: string; label: string };
  /** False where leaving would lose something that cannot be shown again. */
  escape?: boolean;
  children: ReactNode;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!escape) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || event.isComposing) return;
      // Escape in a field belongs to the field, not to the panel.
      if ((event.target as HTMLElement).closest("input, select, textarea")) return;
      navigate("/");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, escape]);

  return (
    <section className="panel" aria-label={title}>
      <div className="panel-head">
        <div>
          {back && (
            <Link to={back.to} className="crumb">
              ← {back.label}
            </Link>
          )}
          <h1>{title}</h1>
        </div>
        <Link to="/" className="panel-close" aria-label="닫기">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
        </Link>
      </div>
      {children}
    </section>
  );
}
