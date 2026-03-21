import type { IntegrationRecord } from "@/lib/workspace";

type TableName = "integrations_google" | "integrations_notion";

export function createIntegrationAdminMock(
  initial: Partial<Record<TableName, IntegrationRecord | null>>
) {
  const state: Partial<Record<TableName, IntegrationRecord | null>> = {
    integrations_google: initial.integrations_google ?? null,
    integrations_notion: initial.integrations_notion ?? null,
  };

  return {
    state,
    createAdminClient() {
      return {
        from(tableName: TableName) {
          return {
            select() {
              return this;
            },
            eq() {
              return this;
            },
            maybeSingle: async () => ({
              data: state[tableName] ?? null,
              error: null,
            }),
            update(updates: Record<string, unknown>) {
              state[tableName] = {
                ...(state[tableName] ?? {
                  user_id: "user-1",
                  status: "disconnected",
                }),
                ...updates,
              } as IntegrationRecord;

              return {
                eq: async () => ({
                  error: null,
                }),
              };
            },
          };
        },
      };
    },
  };
}
