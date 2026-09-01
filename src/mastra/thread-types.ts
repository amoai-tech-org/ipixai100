export type PlannerChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type PlannerThreadRow = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};
