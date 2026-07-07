'use client';

import { Search } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function QuestionSearch({ value, onChange }: Props) {
  return (
    <div className="px-3 pt-2.5">
      <label className="flex items-center gap-2 rounded-[10px] border-[1.5px] border-line-2 bg-surface px-2.5 py-[7px] focus-within:border-copper focus-within:shadow-[0_0_0_3px_var(--copper-050)]">
        <Search className="size-3.5 shrink-0 text-ink-3" />
        <input
          type="search"
          placeholder="Search questions…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-[12.5px] outline-none placeholder:text-ink-3"
        />
      </label>
    </div>
  );
}
