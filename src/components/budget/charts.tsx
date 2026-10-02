import { format, parseISO } from "date-fns";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from "recharts";
import { weeklyHistory, settings } from "@/lib/mockData";

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
const data = weeklyHistory.map((w) => ({ ...w, label: format(parseISO(w.weekStart), "d MMM") }));

export function IncomeLineChart() {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" {...axis} />
          <YAxis {...axis} />
          <Tooltip {...tip} />
          <ReferenceLine
            y={settings.baselineWeeklyIncome}
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

export function IncomeSpendChart() {
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
