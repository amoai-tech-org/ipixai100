import Link from "next/link";

import styles from "./command-center.module.css";

/**
 * DASH-MAIN-002: COPY+CLEAN of Lumina's quick-action-chips.tsx layout,
 * ADAPTed to only show a chip when its destination is a real, verified
 * route — not Lumina's three unconditional chips.
 *
 * "Generate deliverables" and "Review approvals" have no distinct real
 * capability/route in this app yet (no generation route exists; IPI-1084
 * owns the real approval source and hasn't shipped) — both stay hidden
 * rather than pointing at a stub or a fabricated capability. "Plan a
 * shoot" is real: `/app/plans` is the current, owning planning canvas
 * (see IPI-1149's Planner-relationship section), so that's what it links
 * to — not Lumina's old `/app/shoots/new`, which doesn't exist here.
 */
export function QuickActionChips() {
  return (
    <div className={styles.quickActions}>
      <Link href="/app/plans" className={styles.quickPrimary}>
        Plan a shoot
      </Link>
    </div>
  );
}
