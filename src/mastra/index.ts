import { Mastra } from "@mastra/core/mastra";
import { weatherAgent } from "./agents";
import { ConsoleLogger, LogLevel } from "@mastra/core/logger";
import { createMastraStorage } from "./pg-store";

const LOG_LEVEL = (process.env.LOG_LEVEL as LogLevel) || "info";

export const mastra = new Mastra({
  agents: {
    default: weatherAgent,
  },
  storage: createMastraStorage(),
  logger: new ConsoleLogger({
    level: LOG_LEVEL,
  }),
});
