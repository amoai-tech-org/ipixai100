import { Skeleton } from "@/components/ui/skeleton";

/** DASH-MAIN-001: route-level loading boundary so the initial `/app` navigation
 *  shows skeleton rows inside the shell instead of a blank pane while the
 *  trusted-org resolve + brands read are in flight. */
export default function AppHomeLoading() {
  return (
    <div className="p-8" aria-busy="true">
      <span className="sr-only" role="status">
        Loading dashboard…
      </span>
      <div className="flex flex-col gap-8" aria-hidden>
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    </div>
  );
}
