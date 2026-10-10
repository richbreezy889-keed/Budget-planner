import { formatMoney } from "@/lib/format";
import type { ThisWeekView } from "@/lib/selectors";

export function WeekNotice({ week, currency }: { week: ThisWeekView; currency: string }) {
  if (!week.hasIncome) {
    return (
      <div
        role="status"
        className="rounded-[10px] bg-muted px-3 py-2 text-[13px] text-muted-foreground"
      >
        No income logged yet this week
      </div>
    );
  }
  if (week.waterfall.shortfall.essentials > 0) {
    return (
      <div
        role="alert"
        className="rounded-[10px] bg-warn/10 px-3 py-2 text-[13px] text-warn ring-1 ring-warn/30"
      >
        Essentials are short by {formatMoney(week.waterfall.shortfall.essentials, currency)} this
        week, your buffer covers the gap
      </div>
    );
  }
  if (week.flexibleShortfall > 0) {
    return (
      <div
        role="note"
        className="rounded-[10px] bg-accent/60 px-3 py-2 text-[13px] text-accent-foreground"
      >
        Flexible spending is not fully funded by this week's income yet
      </div>
    );
  }
  return null;
}
