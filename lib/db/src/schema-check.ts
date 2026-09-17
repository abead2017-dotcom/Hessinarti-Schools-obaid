import { getTableConfig } from "drizzle-orm/pg-core";
import { applicationTables } from "./schema";

type SchemaColumnRow = {
  table_name: string;
  column_name: string;
};

type Queryable = {
  query(
    queryText: string,
    values: string[],
  ): Promise<{ rows: SchemaColumnRow[] }>;
};

export type MissingSchemaColumn = {
  tableName: string;
  columns: string[];
};

export type SchemaCheckResult = {
  missingTables: string[];
  missingColumns: MissingSchemaColumn[];
};

const expectedTables = Object.entries(applicationTables).map(([tableKey, table]) => {
  const config = getTableConfig(table);
  return {
    tableKey,
    tableName: config.name,
    columns: config.columns.map((column) => column.name),
  };
});

export async function inspectDatabaseSchema(
  client: Queryable,
): Promise<SchemaCheckResult> {
  const expectedTableNames = expectedTables.map(({ tableName }) => tableName);
  const result = await client.query(
    `
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])
      ORDER BY table_name, ordinal_position
    `,
    expectedTableNames,
  );

  const columnsByTable = new Map<string, Set<string>>();
  for (const row of result.rows) {
    const columns = columnsByTable.get(row.table_name) ?? new Set<string>();
    columns.add(row.column_name);
    columnsByTable.set(row.table_name, columns);
  }

  const missingTables: string[] = [];
  const missingColumns: MissingSchemaColumn[] = [];

  for (const expectedTable of expectedTables) {
    const actualColumns = columnsByTable.get(expectedTable.tableName);
    if (!actualColumns) {
      missingTables.push(expectedTable.tableName);
      continue;
    }

    const missing = expectedTable.columns.filter(
      (columnName) => !actualColumns.has(columnName),
    );
    if (missing.length > 0) {
      missingColumns.push({
        tableName: expectedTable.tableName,
        columns: missing,
      });
    }
  }

  return { missingTables, missingColumns };
}

export function formatSchemaCheckFailure(result: SchemaCheckResult): string {
  const details: string[] = [];
  if (result.missingTables.length > 0) {
    details.push(`missing tables: ${result.missingTables.join(", ")}`);
  }
  if (result.missingColumns.length > 0) {
    details.push(
      `missing columns: ${result.missingColumns
        .map(({ tableName, columns }) => `${tableName}.${columns.join(", ")}`)
        .join("; ")}`,
    );
  }

  return details.join(" | ");
}

export async function assertDatabaseSchema(client: Queryable): Promise<void> {
  const result = await inspectDatabaseSchema(client);
  if (result.missingTables.length > 0 || result.missingColumns.length > 0) {
    throw new Error(
      `Database schema is behind the application schema. ${formatSchemaCheckFailure(result)}. Re-publish to apply the schema diff.`,
    );
  }
}