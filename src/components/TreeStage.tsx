import { useSyncExternalStore } from "react";
import { Link } from "react-router";
import { Power } from "@/components/Power";
import { Tree } from "@/components/Tree";
import { getScene, subscribeScene } from "@/lib/scene";
import { FRUIT_SLOTS, treeState } from "@/lib/tree";
import "@/styles/tree.css";

/** Heavier draw, bigger fruit; offline servers are a grey dot. */
const fruitChar = (f: { online: boolean; radius: number }) => (!f.online ? "·" : f.radius <= 9 ? "o" : f.radius <= 12 ? "O" : "@");

/**
 * The tree behind the pages, placed by CSS: centred, beside an open panel, or in the left half
 * on sign-in. Servers hang on it as fruits, one character each; on the home view they carry their
 * name and draw on the outer side of the crown.
 */
export function TreeStage({ labels = false }: { labels?: boolean }) {
  const { fruits, more, health, blight, panel, auth } = useSyncExternalStore(subscribeScene, getScene);
  const showLabels = labels && !panel;
  return (
    <div className={`tree-stage${panel ? " is-panel" : ""}${auth ? " is-auth" : ""}`}>
      <div className="tree-box">
        <Tree state={treeState(health, blight)} />
        {fruits.map((f) => {
          const [col, row] = FRUIT_SLOTS[f.slot];
          const left = col < 24;
          return (
            <Link
              key={f.id}
              to={`/servers/${f.id}`}
              className={`fruit${f.online ? "" : " is-offline"}${left ? " is-left" : ""}`}
              style={{ left: `${col}ch`, top: `${row}lh` }}
              aria-label={`${f.name}${f.online ? "" : " (꺼짐)"}`}
              tabIndex={showLabels ? 0 : -1}
            >
              <span className="fruit-char" aria-hidden="true">
                {fruitChar(f)}
              </span>
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
