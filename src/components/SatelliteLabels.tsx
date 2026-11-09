import { useEffect, useRef, useSyncExternalStore } from "react";
import { Link } from "react-router";
import { Power } from "@/components/Power";
import { getLabelPositions, getOrbit, subscribeFrame, subscribeOrbit } from "@/lib/orbit";
import "@/styles/scene.css";

/**
 * Name and draw under each labelled satellite, moved every frame from the scene's projection.
 * Positions go straight to the DOM through refs; React only re-renders when the servers change.
 */
export function SatelliteLabels() {
  const { satellites, panel } = useSyncExternalStore(subscribeOrbit, getOrbit);
  const labels = useRef(new Map<number, HTMLAnchorElement>());
  const more = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (panel) return;
    const place = () => {
      const positions = getLabelPositions();
      for (const [id, el] of labels.current) {
        const p = positions.get(id);
        el.hidden = !p;
        if (!p) continue;
        el.style.transform = `translate(${p.x}px, ${p.y}px)`;
        el.style.opacity = p.behind ? "0.25" : "";
      }
      if (more.current) more.current.hidden = positions.size === 0;
    };
    place();
    return subscribeFrame(place);
  }, [panel, satellites]);

  if (panel) return null;
  const hiddenCount = satellites.filter((s) => !s.labelled).length;
  return (
    <div className="sat-labels">
      {satellites
        .filter((s) => s.labelled)
        .map((s) => (
          <Link
            key={s.id}
            to={`/servers/${s.id}`}
            className={`sat-label${s.online ? "" : " is-offline"}`}
            hidden
            ref={(el) => {
              if (el) labels.current.set(s.id, el);
              else labels.current.delete(s.id);
            }}
          >
            <span className="sat-name">{s.name}</span>
            {s.online ? <Power value={s.watts} estimated={s.estimated} size="sm" /> : <span className="sat-off">꺼짐</span>}
          </Link>
        ))}
      {hiddenCount > 0 && (
        <Link to="/servers" className="sat-more" ref={more} hidden aria-label={`서버 ${hiddenCount}대 더 보기`}>
          +{hiddenCount}
        </Link>
      )}
    </div>
  );
}

export default SatelliteLabels;
