export interface FriendlyError {
  title: string;
  message: string;
  hint?: string;
}

export function parseSqlError(raw: string): FriendlyError {
  const msg = raw.toLowerCase();

  if (msg.includes('syntax error')) {
    const near = raw.match(/near "(.+?)"/i)?.[1] ?? raw.match(/at or near "(.+?)"/i)?.[1];
    return {
      title: 'Syntax Error',
      message: near
        ? `There's a syntax problem near "${near}". Double-check your spelling and punctuation.`
        : "There's a syntax problem in your query. Check for missing commas, keywords, or parentheses.",
      hint: 'SQL keywords like SELECT, FROM, WHERE must appear in the correct order.',
    };
  }

  if (msg.includes('does not exist') && (msg.includes('relation') || msg.includes('table'))) {
    const table = raw.match(/relation "(\w+)"/i)?.[1] ?? raw.match(/table "?(\w+)"?/i)?.[1];
    return {
      title: 'Table Not Found',
      message: table
        ? `The table "${table}" doesn't exist. Check the Available Tables panel for the correct name.`
        : "You referenced a table that doesn't exist.",
      hint: 'Table names are case-sensitive in PostgreSQL.',
    };
  }

  if (msg.includes('column') && msg.includes('does not exist')) {
    const col = raw.match(/column "(\w+)" of/i)?.[1] ?? raw.match(/column "?(\w+)"?/i)?.[1];
    return {
      title: 'Column Not Found',
      message: col
        ? `The column "${col}" doesn't exist in this table.`
        : "You referenced a column that doesn't exist.",
      hint: 'Use SELECT * to see all available columns first.',
    };
  }

  if (msg.includes('division by zero')) {
    return {
      title: 'Division by Zero',
      message: 'Your query tried to divide by zero.',
      hint: 'Wrap the divisor in a NULLIF check: NULLIF(column, 0)',
    };
  }

  if (msg.includes('permission denied')) {
    return {
      title: 'Permission Denied',
      message: 'This operation is not allowed in the sandbox.',
    };
  }

  if (msg.includes('unique') || msg.includes('duplicate key')) {
    return {
      title: 'Duplicate Value',
      message: "You're trying to insert a value that already exists in a column that requires unique values.",
    };
  }

  if (msg.includes('foreign key') || msg.includes('violates')) {
    return {
      title: 'Data Constraint Violation',
      message: 'Your query violates a table constraint (e.g. a foreign key or unique rule).',
    };
  }

  if (msg.includes('ambiguous')) {
    const col = raw.match(/column "?(\w+)"? is ambiguous/i)?.[1];
    return {
      title: 'Ambiguous Column',
      message: col
        ? `The column "${col}" exists in multiple tables. Use table_name.${col} to specify which one.`
        : 'A column name is ambiguous — it exists in multiple tables in your query.',
      hint: 'Prefix column names with the table name: customers.name, orders.id, etc.',
    };
  }

  const truncated = raw.length > 200 ? raw.slice(0, 200) + '…' : raw;
  return {
    title: 'Query Error',
    message: truncated,
  };
}
