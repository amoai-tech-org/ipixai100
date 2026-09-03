import Link from "next/link";
import { Building2, Camera, ClipboardList } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import type { DashboardBrand } from "@/lib/dashboard/command-center";

import styles from "./command-center.module.css";

type BrandsResult = { ok: true; brands: DashboardBrand[] } | { ok: false };

type Props = {
  brandsResult: BrandsResult;
};

/**
 * DASH-MAIN-001 Command Center. COPY+CLEAN of the Lumina hero/recent-work
 * layout, ADAPTed to org-scoped server data and current DESIGN-001 atoms
 * (Card, EmptyState, ErrorState) instead of Lumina's `CommandCenterBrandSync`
 * / fixtures.
 *
 * No shoot card here: `shoot.shoots` is not PostgREST-exposed and no
 * org/brand-scoped read RPC exists yet (verified live 2026-09-03) — showing
 * a shoot count would mean faking it. Honest "not available yet" instead of
 * a zero, per the no-fake-metrics rule.
 *
 * A failed brand read only replaces the brands section — Quick links are
 * static and stay usable regardless of that query's outcome.
 */
export function CommandCenter({ brandsResult }: Props) {
  return (
    <div className={styles.root} data-testid="command-center">
      <header className={styles.hero}>
        <h1 className={styles.heading}>Dashboard</h1>
        <p className={styles.subheading}>Your organization&apos;s brands.</p>
      </header>

      <section aria-labelledby="command-center-brands">
        <h2 id="command-center-brands" className={styles.sectionHeading}>
          Recent brands
        </h2>
        {!brandsResult.ok ? (
          <ErrorState message="Couldn't load your brands. Please try again shortly." />
        ) : brandsResult.brands.length === 0 ? (
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
            {brandsResult.brands.map((brand) => (
              <li key={brand.id}>
                <Link href="/app/brands" className={styles.brandCardLink}>
                  <Card>
                    <CardHeader>
                      <CardTitle className={styles.brandName}>{brand.name}</CardTitle>
                    </CardHeader>
                  </Card>
                </Link>
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
            <CardContent className={`${styles.quickLinkContent} pt-6`}>
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
            <CardContent className={`${styles.quickLinkContent} pt-6`}>
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
          <Card className={styles.quickLinkCard}>
            <CardContent className={`${styles.quickLinkContent} pt-6`}>
              <ClipboardList aria-hidden className={styles.quickLinkIcon} />
              <div>
                <p className={styles.quickLinkTitle}>Plans</p>
                <p className={styles.quickLinkBody}>Enter the production planning workspace.</p>
              </div>
              <Link href="/app/plans" className={styles.link}>
                Open
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
