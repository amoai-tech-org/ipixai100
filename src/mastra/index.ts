import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { weatherAgent } from "./agents";
import { ConsoleLogger, LogLevel } from "@mastra/core/logger";
import { getMastraPostgresStore, requireMastraPostgresUrl } from "./pg-store";

const LOG_LEVEL = (process.env.LOG_LEVEL as LogLevel) || "info";

function createMastraStorage() {
  const url = requireMastraPostgresUrl();
  if (!url) {
    return new LibSQLStore({
      id: "mastra-storage",
      url: ":memory:",
    });
  }
  return getMastraPostgresStore(url);
}

export const mastra = new Mastra({
  agents: {
    default: weatherAgent,
  },
  storage: createMastraStorage(),
  logger: new ConsoleLogger({
    level: LOG_LEVEL,
  }),
});
