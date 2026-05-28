import { AVAILABLE_TABLES } from './seedData';

export function SqlSchemaPanel() {
  return (
    <div className="text-xs font-mono">
      <p className="text-muted-foreground uppercase tracking-wider mb-2 text-[10px]">
        Available Tables
      </p>
      <div className="flex flex-col gap-1">
        {AVAILABLE_TABLES.map((table) => (
          <details key={table.name} className="group">
            <summary
              className="cursor-pointer hover:text-foreground transition-colors py-0.5 list-none flex items-center gap-1 select-none"
              style={{ color: 'var(--sky-aqua)' }}
            >
              <span className="text-muted-foreground group-open:rotate-90 transition-transform inline-block">
                ▶
              </span>
              {table.name}
            </summary>
            <ul className="ml-4 mt-0.5 flex flex-col gap-0.5">
              {table.columns.map((col) => (
                <li key={col} className="text-muted-foreground">
                  {col}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </div>
  );
}
