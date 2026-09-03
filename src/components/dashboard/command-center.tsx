import Link from "next/link";
import { Building2, Camera } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { DashboardBrand } from "@/lib/dashboard/command-center";

import styles from "./command-center.module.css";

type Props = {
  brands: DashboardBrand[];
};

/**
 * DASH-MAIN-001 Command Center. COPY+CLEAN of the Lumina hero/recent-work
 * layout, ADAPTed to org-scoped server data and current DESIGN-001 atoms
 * (Card, EmptyState) instead of Lumina's `CommandCenterBrandSync` / fixtures.
 *
 * No shoot card here: `shoot.shoots` is not PostgREST-exposed and no
 * org/brand-scoped read RPC exists yet (verified live 2026-09-03) — showing
 * a shoot count would mean faking it. Honest "not available yet" instead of
 * a zero, per the no-fake-metrics rule.
 */
export function CommandCenter({ brands }: Props) {
  return (
    <div className={styles.root} data-testid="command-center">
      <header className={styles.hero}>
        <h1 className={styles.heading}>Dashboard</h1>
        <p className={styles.subheading}>
          Your organization&apos;s brands and next steps.
        </p>
      </header>

      <section aria-labelledby="command-center-brands">
        <h2 id="command-center-brands" className={styles.sectionHeading}>
          Recent brands
        </h2>
        {brands.length === 0 ? (
          <EmptyState
            heading="No brands yet"
            body="Brands your organization creates will show up here."
            icon={<Building2 aria-hidden />}
            action={
              <Link href="/app/brands" className={styles.link}>
                Go to Brands
              </Link>
            }
          />
        ) : (
          <ul className={styles.grid} data-testid="command-center-brand-list">
            {brands.map((brand) => (
              <li key={brand.id}>
                <Card>
                  <CardHeader>
                    <CardTitle className={styles.brandName}>{brand.name}</CardTitle>
                    <CardDescription>Brand</CardDescription>
                  </CardHeader>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="command-center-quick-links">
        <h2 id="command-center-quick-links" className={styles.sectionHeading}>
          Quick links
        </h2>
        <div className={styles.quickLinks}>
          <Card className={styles.quickLinkCard}>
            <CardContent className={styles.quickLinkContent}>
              <Building2 aria-hidden className={styles.quickLinkIcon} />
              <div>
                <p className={styles.quickLinkTitle}>Brands</p>
                <p className={styles.quickLinkBody}>Browse and open brand profiles.</p>
              </div>
              <Link href="/app/brands" className={styles.link}>
                Open
              </Link>
            </CardContent>
          </Card>
          <Card className={styles.quickLinkCard}>
            <CardContent className={styles.quickLinkContent}>
              <Camera aria-hidden className={styles.quickLinkIcon} />
              <div>
                <p className={styles.quickLinkTitle}>Shoots</p>
                <p className={styles.quickLinkBody}>Not available yet on this dashboard.</p>
              </div>
              <Link href="/app/shoots" className={styles.link}>
                Open
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
