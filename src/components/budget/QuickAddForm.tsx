import { categories } from "@/lib/mockData";
import { Panel } from "./Panel";

const field = "w-full rounded-[10px] bg-muted px-3 py-2.5 text-[13px] text-foreground ring-1 ring-border outline-none placeholder:text-muted-foreground focus:ring-primary/50";
const typeLabel = { essential: "Essential", savings: "Savings", flexible: "Flexible" } as const;

export function QuickAddForm() {
  return (
    <Panel title="Quick add">
      <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
        <input className={field} inputMode="decimal" placeholder="Amount" aria-label="Amount" />
        <select className={field} aria-label="Category" defaultValue="groceries">
          <option value="income">Income</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{typeLabel[c.type]} · {c.name}</option>)}
        </select>
        <input className={field} placeholder="Note" aria-label="Note" />
        <button type="submit" className="self-start rounded-[10px] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Add to week</button>
      </form>
    </Panel>
  );
}
