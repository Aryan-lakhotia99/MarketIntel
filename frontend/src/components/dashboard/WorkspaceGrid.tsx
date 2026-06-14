import { GlobalDirectionPanel } from "./GlobalDirectionPanel";
import { NewsEngine } from "./NewsEngine";
import { WhaleTrackerPanel } from "./WhaleTrackerPanel";

export function WorkspaceGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      {/* Column 1 — Global Direction */}
      <div className="xl:col-span-3">
        <GlobalDirectionPanel />
      </div>

      {/* Column 2 — News Engine (double wide) */}
      <div className="xl:col-span-6" id="news">
        <NewsEngine />
      </div>

      {/* Column 3 — Whale Tracker */}
      <div className="xl:col-span-3">
        <WhaleTrackerPanel />
      </div>
    </div>
  );
}
