"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityList } from "@/components/ui/entity-list";
import { ErrorState } from "@/components/ui/error-state";
import { StatusChip } from "@/components/ui/status-chip";

const SAMPLE_ROWS = [
  { id: "1", name: "SS26 lookbook" },
  { id: "2", name: "Campaign stills" },
];

export default function DesignStubPage() {
  return (
    <main className="mx-auto flex min-h-full max-w-5xl flex-col gap-6 p-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-[var(--color-text-muted)]">
          DESIGN-001 placeholder — no nav (APP-001)
        </p>
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
          iPix visual system
        </h1>
      </header>

      <div className="flex flex-wrap gap-3">
        <Button type="button">Primary button</Button>
        <Button type="button" variant="secondary">
          Secondary
        </Button>
        <StatusChip dot="var(--color-approved)" label="Active" />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card className="rounded-[var(--radius-xl)] shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle>Card</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--color-text-secondary)]">
            20px radius via <code className="font-mono">--radius-xl</code>. Primary
            fill is <code className="font-mono">--color-action</code> (#111).
          </CardContent>
        </Card>

        <EntityList
          items={SAMPLE_ROWS}
          emptyLabel="No shoots yet"
          renderRow={(row) => (
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 text-sm">
              {row.name}
            </div>
          )}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <EmptyState heading="Nothing here" body="Empty list state." />
        <ErrorState message="Could not load this list." />
        <EntityList
          items={[]}
          emptyLabel="Loading uses Skeleton"
          loading
          renderRow={() => null}
        />
      </div>
    </main>
  );
}
