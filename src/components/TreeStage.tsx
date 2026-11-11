import { useSyncExternalStore } from "react";
import { Link } from "react-router";
import { Power } from "@/components/Power";
import { Tree } from "@/components/Tree";
import { getScene, subscribeScene } from "@/lib/scene";
import { FRUIT_SLOTS, treeState } from "@/lib/tree";
import "@/styles/tree.css";

const pct = (v: number) => `${(v / 400) * 100}%`;

/**
 * The tree behind the pages, placed by CSS: centred, beside an open panel, or in the left half
 * on sign-in. Servers hang on it as fruits; on the home view they carry their name and draw.
 */
export function TreeStage({ labels = false }: { labels?: boolean }) {
  const { fruits, more, health, blight, panel, auth } = useSyncExternalStore(subscribeScene, getScene);
  const showLabels = labels && !panel;
  return (
    <div className={`tree-stage${panel ? " is-panel" : ""}${auth ? " is-auth" : ""}`}>
      <div className="tree-box">
        <Tree state={treeState(health, blight)} />
        {fruits.map((f) => {
          const [x, y] = FRUIT_SLOTS[f.slot];
          return (
            <Link
              key={f.id}
              to={`/servers/${f.id}`}
              className={`fruit${f.online ? "" : " is-offline"}`}
              style={{ left: pct(x), top: pct(y), width: pct(f.radius * 2), height: pct(f.radius * 2) }}
              aria-label={`${f.name}${f.online ? "" : " (꺼짐)"}`}
              tabIndex={showLabels ? 0 : -1}
            >
              {showLabels && f.labelled && (
                <span className="fruit-label">
                  <span className="fruit-name">{f.name}</span>
                  {f.online ? <Power value={f.watts} estimated={f.estimated} size="sm" /> : <span className="fruit-off">꺼짐</span>}
                </span>
              )}
            </Link>
          );
        })}
        {showLabels && more > 0 && (
          <Link to="/servers" className="fruit-more" aria-label={`서버 ${more}대 더 보기`}>
            +{more}
          </Link>
        )}
      </div>
    </div>
  );
}
