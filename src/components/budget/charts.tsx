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

import { formatMoney } from "@/lib/format";
import type { ISODate } from "@/lib/types";

export interface SeriesPoint {
  weekStart: ISODate;
  income: number;
  spending: number;
  tracked: boolean;
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

interface ChartPoint {
  weekStart: ISODate;
  income: number | null;
  spending: number | null;
  label: string;
}

function labelled(series: SeriesPoint[]): ChartPoint[] {
  return series.map((week, index) => ({
    weekStart: week.weekStart,
    income: week.tracked ? week.income : null,
    spending: week.tracked ? week.spending : null,
    label:
      index === series.length - 1
        ? `${format(parseISO(week.weekStart), "d MMM")} (so far)`
        : format(parseISO(week.weekStart), "d MMM"),
  }));
}

function incomeDomain(points: ChartPoint[], baseline: number): [number, number] {
  const values = points
    .map((point) => point.income)
    .filter((value): value is number => value !== null);
  const max = Math.max(baseline, 0, ...values);
  const min = Math.min(baseline, 0, ...values);
  const span = max - min;
  const pad = span > 0 ? span * 0.12 : Math.max(1, max) * 0.1;
  return [Math.max(0, min - pad), max + pad];
}

export function IncomeLineChart({
  series,
  baseline,
  currency,
}: {
  series: SeriesPoint[];
  baseline: number;
  currency: string;
}) {
  const data = labelled(series);
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" {...axis} />
          <YAxis {...axis} domain={incomeDomain(data, baseline)} />
          <Tooltip {...tip} />
          <ReferenceLine
            y={baseline}
            stroke="var(--warn)"
            strokeDasharray="6 5"
            label={{
              value: `Baseline ${formatMoney(baseline, currency)}`,
              fill: "var(--warn)",
              fontSize: 11,
              position: "insideTopLeft",
            }}
          />
          <Line
            type="linear"
            dataKey="income"
            stroke="var(--primary)"
            strokeWidth={2.5}
            connectNulls={false}
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
