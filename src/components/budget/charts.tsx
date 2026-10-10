import { format, parseISO } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ISODate } from "@/lib/types";

export interface SeriesPoint {
  weekStart: ISODate;
  income: number;
  spending: number;
}

const axis = {
  stroke: "var(--muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;
const tip = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    fontSize: 12,
  },
  labelStyle: { color: "var(--muted-foreground)" },
};

function labelled(
  series: SeriesPoint[],
): { weekStart: ISODate; income: number; spending: number; label: string }[] {
  return series.map((week, index) => ({
    ...week,
    label:
      index === series.length - 1
        ? `${format(parseISO(week.weekStart), "d MMM")} (so far)`
        : format(parseISO(week.weekStart), "d MMM"),
  }));
}

export function IncomeLineChart({ series, baseline }: { series: SeriesPoint[]; baseline: number }) {
  const data = labelled(series);
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" {...axis} />
          <YAxis {...axis} />
          <Tooltip {...tip} />
          <ReferenceLine
            y={baseline}
            stroke="var(--warn)"
            strokeDasharray="6 5"
            label={{
              value: "Baseline",
              fill: "var(--warn)",
              fontSize: 11,
              position: "insideTopLeft",
            }}
          />
          <Line
            type="monotone"
            dataKey="income"
            stroke="var(--primary)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "var(--primary)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function IncomeSpendChart({ series }: { series: SeriesPoint[] }) {
  const data = labelled(series);
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" {...axis} />
          <YAxis {...axis} />
          <Tooltip {...tip} cursor={{ fill: "var(--muted)" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="income" name="Income" fill="var(--primary)" radius={[6, 6, 0, 0]} />
          <Bar dataKey="spending" name="Spending" fill="var(--sky)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
