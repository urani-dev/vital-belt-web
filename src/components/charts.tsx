import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { Point, WavePoint, WeeklyRange } from "../data/mockSeries";

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

/** Màu theo design: mạch đỏ, hô hấp xanh, điểm tổng xanh đậm. Chữ/trục dùng màu mực, không dùng màu series. */
export const CHART_COLOR = {
  pulse: "#d23c3c",
  breath: "#2f78c4",
  overall: "#2f4f7f",
  /** Nhãn trục: đậm hơn màu muted (#8a8782) để đọc rõ trên nền trắng (tương phản ~9:1). */
  axis: "#282525",
  grid: "#ecebe7",
} as const;

const AXIS_LABEL = { color: CHART_COLOR.axis, fontSize: 10, fontWeight: 500 };
const SPLIT_LINE = { lineStyle: { color: CHART_COLOR.grid } };
const TOOLTIP = {
  backgroundColor: "#ffffff",
  borderColor: "#e4e2dd",
  textStyle: { color: "#1f1f1f", fontSize: 11 },
};

function EChart({ option, height, label }: { option: echarts.EChartsCoreOption; height: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const instance = echarts.init(ref.current, undefined, { renderer: "canvas" });
    chart.current = instance;
    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      instance.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    chart.current?.setOption(option, { notMerge: false, lazyUpdate: true });
  }, [option]);

  return <div ref={ref} role="img" aria-label={label} style={{ height }} className="w-full" />;
}

const hhmm = (ts: number) => {
  const d = new Date(ts);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** F8 — 24 時間の変化 (điểm tổng). */
export function Overall24hChart({ data }: { data: Point[] }) {
  const first = data[0]?.[0] ?? 0;
  const last = data[data.length - 1]?.[0] ?? 0;
  const option: echarts.EChartsCoreOption = {
    animation: false,
    grid: { left: 28, right: 8, top: 8, bottom: 22 },
    tooltip: { ...TOOLTIP, trigger: "axis", formatter: (p: Array<{ value: Point }>) => `${hhmm(p[0]!.value[0])}　総合 ${p[0]!.value[1]}` },
    xAxis: {
      type: "time",
      min: first,
      max: last,
      axisLabel: {
        ...AXIS_LABEL,
        customValues: [first, (first + last) / 2, last],
        formatter: (v: number) => (v === first ? `昨日 ${hhmm(v)}` : hhmm(v)),
      },
      axisTick: { customValues: [first, (first + last) / 2, last] },
      axisLine: { lineStyle: { color: CHART_COLOR.grid } },
    },
    yAxis: { type: "value", min: 0, max: 100, interval: 50, axisLabel: AXIS_LABEL, splitLine: SPLIT_LINE },
    series: [{ type: "line", data, showSymbol: false, lineStyle: { width: 2, color: CHART_COLOR.overall }, itemStyle: { color: CHART_COLOR.overall } }],
  };
  return <EChart option={option} height={120} label="総合コンディション 24 時間の変化" />;
}

/** F10 — sóng realtime (6 秒 / 18 秒). null trong dữ liệu = ngắt nét ở khoảng mất packet. */
export function WaveChart({ data, color, seconds, label }: { data: WavePoint[]; color: string; seconds: number; label: string }) {
  const option: echarts.EChartsCoreOption = {
    animation: false,
    grid: { left: 8, right: 8, top: 6, bottom: 20 },
    xAxis: {
      type: "value",
      min: 0,
      max: seconds,
      interval: seconds / 3,
      axisLabel: { ...AXIS_LABEL, formatter: (v: number) => (v === seconds ? `${v}秒` : String(v)) },
      axisLine: { lineStyle: { color: CHART_COLOR.grid } },
      splitLine: { show: false },
    },
    yAxis: { type: "value", show: false, scale: true },
    series: [{ type: "line", data, showSymbol: false, lineStyle: { width: 1.5, color }, silent: true }],
  };
  return <EChart option={option} height={90} label={label} />;
}

/** F10 — 日次 (6 時 → 翌 6 時). */
export function DailyChart({ data, color, unit, yRange }: { data: Point[]; color: string; unit: string; yRange: [number, number] }) {
  const first = data[0]?.[0] ?? 0;
  const last = data[data.length - 1]?.[0] ?? 0;
  const option: echarts.EChartsCoreOption = {
    animation: false,
    grid: { left: 26, right: 6, top: 10, bottom: 20 },
    tooltip: { ...TOOLTIP, trigger: "axis", formatter: (p: Array<{ value: Point }>) => `${hhmm(p[0]!.value[0])}　${p[0]!.value[1]} ${unit}` },
    xAxis: {
      type: "time",
      min: first,
      max: last,
      axisLabel: {
        ...AXIS_LABEL,
        customValues: [first, (first + last) / 2, last],
        formatter: (v: number) => (v === first ? "6時" : v === last ? "翌6時" : "18時"),
      },
      axisTick: { customValues: [first, (first + last) / 2, last] },
      axisLine: { lineStyle: { color: CHART_COLOR.grid } },
    },
    yAxis: { type: "value", min: yRange[0], max: yRange[1], interval: (yRange[1] - yRange[0]) / 2, axisLabel: AXIS_LABEL, splitLine: SPLIT_LINE },
    series: [{ type: "line", data, showSymbol: false, lineStyle: { width: 1.5, color }, itemStyle: { color } }],
  };
  return <EChart option={option} height={110} label={`日次 ${unit}`} />;
}

const WEEKDAY = ["日", "月", "火", "水", "木", "金", "土"];

/** F10 — 週次: thanh min–max mỗi ngày (cột trong suốt làm chân + cột màu là khoảng). */
export function WeeklyChart({ data, color, unit, yRange }: { data: WeeklyRange[]; color: string; unit: string; yRange: [number, number] }) {
  const [lo, hi] = yRange;
  const option: echarts.EChartsCoreOption = {
    animation: false,
    grid: { left: 26, right: 6, top: 10, bottom: 20 },
    tooltip: {
      ...TOOLTIP,
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (p: Array<{ dataIndex: number }>) => {
        const d = data[p[0]!.dataIndex]!;
        return `${WEEKDAY[d.day]}　${d.min}〜${d.max} ${unit}`;
      },
    },
    xAxis: { type: "category", data: WEEKDAY, axisLabel: AXIS_LABEL, axisTick: { show: false }, axisLine: { lineStyle: { color: CHART_COLOR.grid } } },
    yAxis: {
      type: "value",
      min: 0,
      max: hi - lo,
      interval: (hi - lo) / 2,
      axisLabel: { ...AXIS_LABEL, formatter: (v: number) => String(v + lo) },
      splitLine: SPLIT_LINE,
    },
    series: [
      { type: "bar", stack: "range", data: data.map((d) => Math.max(0, d.min - lo)), itemStyle: { color: "transparent" }, silent: true, barWidth: 4 },
      { type: "bar", stack: "range", data: data.map((d) => d.max - Math.max(d.min, lo)), itemStyle: { color, borderRadius: 2 }, barWidth: 4 },
    ],
  };
  return <EChart option={option} height={110} label={`週次 ${unit}`} />;
}
