import { AbstractAgent, type BaseEvent } from "@ag-ui/client";
import { EventType, type RunAgentInput } from "@ag-ui/core";
import { Pool } from "pg";
import { Observable } from "rxjs";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as agent from "../src/agent";
import { POST } from "../src/app/api/copilotkit/[[...slug]]/route";
import * as threadClaim from "../src/lib/auth/thread-claim";
import {
  CLAIM_INSERT_SQL,
  CLAIM_SELECT_SQL,
  claimPlannerThread,
  type ClaimSql,
} from "../src/lib/auth/thread-claim";
import { memoryResourceId } from "../src/lib/auth/verified-operator";
import * as threadPersistence from "../src/mastra/thread-persistence";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const ORG_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORG_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const RESOURCE_A = memoryResourceId({ userId: USER_A, orgId: ORG_A });
const RESOURCE_B = memoryResourceId({ userId: USER_B, orgId: ORG_B });

const memberships: { rows: { org_id: string }[] } = { rows: [] };
const claims: { sub?: string; email?: string } = {
  sub: USER_A,
  email: "operator@example.com",
};

vi.mock("../src/lib/supabase/server", () => ({
  createClientFromRequest: () => ({
    auth: {
      getClaims: async () => ({
        data: { claims: { sub: claims.sub, email: claims.email } },
        error: claims.sub ? null : { message: "invalid JWT" },
      }),
    },
    from: (table: string) => ({
      select: () => ({
        eq: async () => {
          if (table !== "org_members") {
            return { data: null, error: { message: "unexpected table" } };
          }
          return { data: memberships.rows, error: null };
        },
      }),
    }),
  }),
  createClient: async () => null,
}));

afterEach(() => {
  memberships.rows = [];
  claims.sub = USER_A;
  claims.email = "operator@example.com";
  vi.restoreAllMocks();
});

function memoryClaimStore(): ClaimSql & { rows: Map<string, string> } {
  const rows = new Map<string, string>();
  return {
    rows,
    query: async (text, values) => {
      const threadId = values[0];
      if (text.includes("ON CONFLICT")) {
        const resourceId = values[1];
        if (rows.has(threadId)) return { rows: [] };
        rows.set(threadId, resourceId);
        return { rows: [{ resource_id: resourceId }] };
      }
      const resource_id = rows.get(threadId);
      return { rows: resource_id ? [{ resource_id }] : [] };
    },
  };
}

function copilotRequest(
  path: string,
  body: Record<string, unknown>,
  method = "POST",
): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function runBody(threadId: string) {
  return {
    threadId,
    runId: `run-${threadId}`,
    state: {},
    messages: [{ id: "msg-user", role: "user" as const, content: "plan SS26" }],
    tools: [],
    context: [],
    forwardedProps: {},
  };
}

function createFiniteAgent(onRun?: () => void) {
  class ClaimTestAgent extends AbstractAgent {
    constructor() {
      super({ agentId: "default", description: "access-claim-001" });
    }
    override run(input: RunAgentInput): Observable<BaseEvent> {
      onRun?.();
      return new Observable((subscriber) => {
        subscriber.next({
          type: EventType.RUN_STARTED,
          threadId: input.threadId,
          runId: input.runId,
        });
        subscriber.next({
          type: EventType.RUN_FINISHED,
          threadId: input.threadId,
          runId: input.runId,
        });
        subscriber.complete();
      });
    }
  }
  return new ClaimTestAgent();
}

describe("IPI-1127 · ACCESS-CLAIM-001 claim helper", () => {
  it("lets the first insert win and the same owner retry", async () => {
    const sql = memoryClaimStore();
    const threadId = "11111111-1111-4111-8111-111111111111";
    const first = await claimPlannerThread(
      { threadId, resourceId: RESOURCE_A },
      sql,
    );
    const retry = await claimPlannerThread(
      { threadId, resourceId: RESOURCE_A },
      sql,
    );
    expect(first).toEqual({ status: "owned", resourceId: RESOURCE_A });
    expect(retry).toEqual({ status: "owned", resourceId: RESOURCE_A });
    expect(sql.rows.get(threadId)).toBe(RESOURCE_A);
  });

  it("denies a foreign owner after the first claim", async () => {
    const sql = memoryClaimStore();
    const threadId = "22222222-2222-4222-8222-222222222222";
    await claimPlannerThread({ threadId, resourceId: RESOURCE_A }, sql);
    const loser = await claimPlannerThread(
      { threadId, resourceId: RESOURCE_B },
      sql,
    );
    expect(loser).toEqual({ status: "forbidden", resourceId: RESOURCE_A });
  });

  it("rejects malformed thread IDs before SQL", async () => {
    const query = vi.fn(async () => ({ rows: [] }));
    for (const threadId of ["", "thread-access-continue", "not-a-uuid"]) {
      expect(
        await claimPlannerThread({ threadId, resourceId: RESOURCE_A }, { query }),
      ).toEqual({ status: "invalid" });
    }
    expect(query).not.toHaveBeenCalled();
  });

  it("fails closed when the claim store throws or returns no winner", async () => {
    const down = await claimPlannerThread(
      { threadId: "33333333-3333-4333-8333-333333333333", resourceId: RESOURCE_A },
      {
        query: async () => {
          throw new Error("db down");
        },
      },
    );
    expect(down).toEqual({ status: "unavailable" });

    const vanished = await claimPlannerThread(
      { threadId: "44444444-4444-4444-8444-444444444444", resourceId: RESOURCE_A },
      { query: async () => ({ rows: [] }) },
    );
    expect(vanished).toEqual({ status: "unavailable" });
  });
});

describe("IPI-1127 · ACCESS-CLAIM-001 CopilotKit first-create", () => {
  it("returns 403 thread_forbidden before agent dispatch for a foreign first-create loser", async () => {
    let loserDispatched = false;
    vi.spyOn(agent, "createLocalAgents").mockReturnValue({
      default: createFiniteAgent(),
    });
    vi.spyOn(threadPersistence, "getPlannerMemory").mockResolvedValue({
      getThreadById: async () => null,
      createThread: async () => ({}),
    } as unknown as Awaited<ReturnType<typeof threadPersistence.getPlannerMemory>>);
    const sql = memoryClaimStore();
    const originalClaim = threadClaim.claimPlannerThread;
    vi.spyOn(threadClaim, "claimPlannerThread").mockImplementation((input) =>
      originalClaim(input, sql),
    );

    const threadId = "55555555-5555-4555-8555-555555555555";
    memberships.rows = [{ org_id: ORG_A }];
    claims.sub = USER_A;
    const winner = await POST(
      copilotRequest("/api/copilotkit/agent/default/run", runBody(threadId)),
    );
    expect(winner.status).toBe(200);

    vi.spyOn(agent, "createLocalAgents").mockReturnValue({
      default: createFiniteAgent(() => {
        loserDispatched = true;
      }),
    });
    memberships.rows = [{ org_id: ORG_B }];
    claims.sub = USER_B;
    const loser = await POST(
      copilotRequest("/api/copilotkit/agent/default/run", runBody(threadId)),
    );
    expect(loser.status).toBe(403);
    expect(await loser.json()).toEqual({
      error: "forbidden",
      reason: "thread_forbidden",
    });
    expect(loserDispatched).toBe(false);
    expect(sql.rows.get(threadId)).toBe(RESOURCE_A);
  });

  it("returns 503 claim_unavailable when the claim store fails on first create", async () => {
    let ran = false;
    vi.spyOn(agent, "createLocalAgents").mockReturnValue({
      default: createFiniteAgent(() => {
        ran = true;
      }),
    });
    vi.spyOn(threadPersistence, "getPlannerMemory").mockResolvedValue({
      getThreadById: async () => null,
      createThread: async () => ({}),
    } as unknown as Awaited<ReturnType<typeof threadPersistence.getPlannerMemory>>);
    vi.spyOn(threadClaim, "claimPlannerThread").mockResolvedValue({
      status: "unavailable",
    });

    memberships.rows = [{ org_id: ORG_A }];
    claims.sub = USER_A;
    const response = await POST(
      copilotRequest(
        "/api/copilotkit/agent/default/run",
        runBody("66666666-6666-4666-8666-666666666666"),
      ),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "unavailable",
      reason: "claim_unavailable",
    });
    expect(ran).toBe(false);
  });

  it("keeps ACCESS-001 behavior for a pre-existing Mastra thread", async () => {
    let ran = false;
    vi.spyOn(agent, "createLocalAgents").mockReturnValue({
      default: createFiniteAgent(() => {
        ran = true;
      }),
    });
    const threadId = "77777777-7777-4777-8777-777777777777";
    vi.spyOn(threadPersistence, "getPlannerMemory").mockResolvedValue({
      getThreadById: async () => ({ resourceId: RESOURCE_A }),
    } as unknown as Awaited<ReturnType<typeof threadPersistence.getPlannerMemory>>);
    const claimSpy = vi.spyOn(threadClaim, "claimPlannerThread");

    memberships.rows = [{ org_id: ORG_B }];
    claims.sub = USER_B;
    const denied = await POST(
      copilotRequest("/api/copilotkit/agent/default/run", runBody(threadId)),
    );
    expect(denied.status).toBe(403);
    expect(claimSpy).not.toHaveBeenCalled();
    expect(ran).toBe(false);
  });

  it("claims on connect first-create and denies a foreign connect", async () => {
    vi.spyOn(agent, "createLocalAgents").mockReturnValue({
      default: createFiniteAgent(),
    });
    vi.spyOn(threadPersistence, "getPlannerMemory").mockResolvedValue({
      getThreadById: async () => null,
      createThread: async () => ({}),
    } as unknown as Awaited<ReturnType<typeof threadPersistence.getPlannerMemory>>);
    const sql = memoryClaimStore();
    const originalClaim = threadClaim.claimPlannerThread;
    vi.spyOn(threadClaim, "claimPlannerThread").mockImplementation((input) =>
      originalClaim(input, sql),
    );

    const threadId = "88888888-8888-4888-8888-888888888888";
    memberships.rows = [{ org_id: ORG_A }];
    claims.sub = USER_A;
    const winner = await POST(
      copilotRequest("/api/copilotkit/agent/default/connect", runBody(threadId)),
    );
    expect([200, 204]).toContain(winner.status);
    if (winner.body) await winner.text();

    memberships.rows = [{ org_id: ORG_B }];
    claims.sub = USER_B;
    const loser = await POST(
      copilotRequest("/api/copilotkit/agent/default/connect", runBody(threadId)),
    );
    expect(loser.status).toBe(403);
    expect(sql.rows.get(threadId)).toBe(RESOURCE_A);
  });
});

const concurrencyEnabled = process.env.IPIX_CLAIM_CONCURRENCY === "1";
const concurrencyUrl = process.env.MASTRA_DATABASE_URL;

describe.skipIf(!concurrencyEnabled || !concurrencyUrl)(
  "IPI-1127 · ACCESS-CLAIM-001 shared Postgres concurrency",
  () => {
    it("serializes Org A vs Org B to exactly one durable winner", async () => {
      const url = concurrencyUrl!;
      const iterations = 12;
      for (let i = 0; i < iterations; i += 1) {
        const threadId = crypto.randomUUID();
        const poolA = new Pool({ connectionString: url, max: 1 });
        const poolB = new Pool({ connectionString: url, max: 1 });
        try {
          const sqlA: ClaimSql = {
            query: (text, values) => poolA.query(text, values),
          };
          const sqlB: ClaimSql = {
            query: (text, values) => poolB.query(text, values),
          };
          const [left, right] = await Promise.all([
            claimPlannerThread({ threadId, resourceId: RESOURCE_A }, sqlA),
            claimPlannerThread({ threadId, resourceId: RESOURCE_B }, sqlB),
          ]);
          const outcomes = [left, right];
          const winners = outcomes.filter((row) => row.status === "owned");
          const losers = outcomes.filter((row) => row.status === "forbidden");
          expect(winners).toHaveLength(1);
          expect(losers).toHaveLength(1);
          const claimedOwner =
            winners[0] && winners[0].status === "owned"
              ? winners[0].resourceId
              : undefined;
          expect(losers[0]).toMatchObject({
            status: "forbidden",
            resourceId: claimedOwner,
          });

          const durable = await poolA.query<{ resource_id: string }>(
            CLAIM_SELECT_SQL,
            [threadId],
          );
          expect(durable.rows).toHaveLength(1);
          const storedOwner = durable.rows[0]?.resource_id;
          expect(storedOwner).toBe(claimedOwner);

          const winnerRetry = await claimPlannerThread(
            { threadId, resourceId: storedOwner! },
            sqlA,
          );
          const otherResource =
            storedOwner === RESOURCE_A ? RESOURCE_B : RESOURCE_A;
          const loserRetry = await claimPlannerThread(
            { threadId, resourceId: otherResource },
            sqlB,
          );
          expect(winnerRetry).toEqual({
            status: "owned",
            resourceId: storedOwner,
          });
          expect(loserRetry).toEqual({
            status: "forbidden",
            resourceId: storedOwner,
          });
        } finally {
          await poolA.end();
          await poolB.end();
        }
      }
    });

    it("lets the same owner race itself without a second row", async () => {
      const url = concurrencyUrl!;
      const threadId = crypto.randomUUID();
      const poolA = new Pool({ connectionString: url, max: 1 });
      const poolB = new Pool({ connectionString: url, max: 1 });
      try {
        const [left, right] = await Promise.all([
          claimPlannerThread(
            { threadId, resourceId: RESOURCE_A },
            { query: (text, values) => poolA.query(text, values) },
          ),
          claimPlannerThread(
            { threadId, resourceId: RESOURCE_A },
            { query: (text, values) => poolB.query(text, values) },
          ),
        ]);
        expect(left.status).toBe("owned");
        expect(right.status).toBe("owned");
        const durable = await poolA.query(
          "SELECT count(*)::int AS n FROM planner.planner_thread_claims WHERE thread_id = $1::uuid",
          [threadId],
        );
        expect(durable.rows[0]?.n).toBe(1);
      } finally {
        await poolA.end();
        await poolB.end();
      }
    });

    it("uses INSERT ON CONFLICT DO NOTHING then a second SELECT", async () => {
      expect(CLAIM_INSERT_SQL).toMatch(/ON CONFLICT \(thread_id\) DO NOTHING/);
      expect(CLAIM_INSERT_SQL).toMatch(/RETURNING resource_id/);
      expect(CLAIM_SELECT_SQL).toMatch(/^SELECT resource_id/);
    });
  },
);
