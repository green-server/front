import { useEffect, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { setScene } from "@/lib/scene";

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
    setScene({ panel: true });
    return () => setScene({ panel: false });
  }, []);

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

  // The frame stays put; only the body scrolls, so the box lines never scroll away.
  return (
    <section className="panel frame" aria-label={title}>
      <div className="panel-head">
        <span className="panel-title">
          {back && (
            <>
              <Link to={back.to} className="crumb">
                ← {back.label}
              </Link>
              {" › "}
            </>
          )}
          <h1>{title}</h1>
        </span>
        <Link to="/" className="panel-close" aria-label="닫기">
          [x]
        </Link>
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}
