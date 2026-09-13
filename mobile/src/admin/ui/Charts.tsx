import { useMemo } from "react";
import { View } from "react-native";
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from "react-native-svg";
import { A, Col, Row } from "./primitives";
import { CHART_COLORS, type AdminTheme } from "./theme";
import type { RankedItem, SeriesPoint } from "@/admin/core/metrics";

interface Scale {
  x(index: number): number;
  y(value: number): number;
}

function makeScale(
  count: number,
  max: number,
  width: number,
  height: number,
  padding: number,
): Scale {
  const innerWidth = Math.max(1, width - padding * 2);
  const innerHeight = Math.max(1, height - padding * 2);
  const step = count > 1 ? innerWidth / (count - 1) : 0;
  return {
    x: (index) => padding + step * index,
    y: (value) =>
      padding + innerHeight - (max > 0 ? (value / max) * innerHeight : 0),
  };
}

function niceMax(values: number[]): number {
  const highest = Math.max(0, ...values);
  if (highest === 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(highest));
  return Math.ceil(highest / magnitude) * magnitude;
}

export function LineChart({
  series,
  theme,
  color,
  height = 180,
  width = 640,
  label,
  fill = true,
}: {
  series: SeriesPoint[];
  theme: AdminTheme;
  color?: string;
  height?: number;
  width?: number;
  label?: string;
  fill?: boolean;
}) {
  const tint = color ?? theme.primary;
  const padding = 24;
  const max = niceMax(series.map((point) => point.value));
  const scale = makeScale(series.length, max, width, height, padding);

  const { line, area } = useMemo(() => {
    if (series.length < 2) return { line: "", area: "" };
    const points = series.map(
      (point, index) => `${scale.x(index)},${scale.y(point.value)}`,
    );
    const path = `M${points.join(" L")}`;
    return {
      line: path,
      area: `${path} L${scale.x(series.length - 1)},${height - padding} L${scale.x(0)},${height - padding} Z`,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, max, width, height]);

  if (!series.length) {
    return (
      <View style={{ height, alignItems: "center", justifyContent: "center" }}>
        <A size={12} color={theme.muted}>
          No data for this period.
        </A>
      </View>
    );
  }

  const ticks = [0, 0.5, 1];
  const labelEvery = Math.max(1, Math.ceil(series.length / 6));

  return (
    <Svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      accessibilityLabel={label}
    >
      {ticks.map((ratio) => (
        <G key={ratio}>
          <Line
            x1={padding}
            x2={width - padding}
            y1={scale.y(max * ratio)}
            y2={scale.y(max * ratio)}
            stroke={theme.border}
            strokeWidth={1}
          />
          <SvgText
            x={2}
            y={scale.y(max * ratio) + 3}
            fill={theme.muted}
            fontSize={9}
          >
            {Math.round(max * ratio)}
          </SvgText>
        </G>
      ))}
      {fill && !!area && <Path d={area} fill={`${tint}18`} />}
      {!!line && <Path d={line} stroke={tint} strokeWidth={2} fill="none" />}
      {series.map((point, index) =>
        series.length <= 40 ? (
          <Circle
            key={point.at}
            cx={scale.x(index)}
            cy={scale.y(point.value)}
            r={2.5}
            fill={tint}
          />
        ) : null,
      )}
      {series.map((point, index) =>
        index % labelEvery === 0 ? (
          <SvgText
            key={`label-${point.at}`}
            x={scale.x(index)}
            y={height - 6}
            fill={theme.muted}
            fontSize={9}
            textAnchor="middle"
          >
            {point.label}
          </SvgText>
        ) : null,
      )}
    </Svg>
  );
}

export function BarChart({
  series,
  theme,
  color,
  height = 180,
  width = 640,
  label,
}: {
  series: SeriesPoint[];
  theme: AdminTheme;
  color?: string;
  height?: number;
  width?: number;
  label?: string;
}) {
  const tint = color ?? theme.info;
  const padding = 24;
  const max = niceMax(series.map((point) => point.value));
  const innerHeight = height - padding * 2;
  const innerWidth = width - padding * 2;
  const slot = series.length ? innerWidth / series.length : innerWidth;
  const barWidth = Math.max(2, Math.min(28, slot * 0.62));
  const labelEvery = Math.max(1, Math.ceil(series.length / 8));

  if (!series.length) {
    return (
      <View style={{ height, alignItems: "center", justifyContent: "center" }}>
        <A size={12} color={theme.muted}>
          No data for this period.
        </A>
      </View>
    );
  }

  return (
    <Svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      accessibilityLabel={label}
    >
      <Line
        x1={padding}
        x2={width - padding}
        y1={height - padding}
        y2={height - padding}
        stroke={theme.border}
      />
      {series.map((point, index) => {
        const barHeight = max > 0 ? (point.value / max) * innerHeight : 0;
        const x = padding + slot * index + (slot - barWidth) / 2;
        return (
          <G key={point.at}>
            <Rect
              x={x}
              y={height - padding - barHeight}
              width={barWidth}
              height={Math.max(0, barHeight)}
              rx={3}
              fill={tint}
            />
            {index % labelEvery === 0 && (
              <SvgText
                x={x + barWidth / 2}
                y={height - 6}
                fill={theme.muted}
                fontSize={9}
                textAnchor="middle"
              >
                {point.label}
              </SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
}

export function Sparkline({
  series,
  color,
  width = 120,
  height = 30,
}: {
  series: SeriesPoint[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (series.length < 2) return <View style={{ width, height }} />;
  const max = niceMax(series.map((point) => point.value));
  const step = width / (series.length - 1);
  const path = series
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${index * step},${height - (point.value / max) * height}`,
    )
    .join(" ");
  return (
    <Svg width={width} height={height}>
      <Path d={path} stroke={color} strokeWidth={1.6} fill="none" />
    </Svg>
  );
}

export function DonutChart({
  items,
  theme,
  size = 150,
  label,
}: {
  items: RankedItem[];
  theme: AdminTheme;
  size?: number;
  label?: string;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const radius = size / 2 - 8;
  const inner = radius * 0.58;
  const centre = size / 2;

  if (!total) {
    return (
      <View
        style={{ height: size, alignItems: "center", justifyContent: "center" }}
      >
        <A size={12} color={theme.muted}>
          Nothing to show yet.
        </A>
      </View>
    );
  }

  // Each slice starts where the ones before it finished.
  const offsets = items.reduce<number[]>((acc, item, index) => {
    const previous = acc[index - 1] ?? 0;
    acc.push(previous + (item.value / total) * Math.PI * 2);
    return acc;
  }, []);
  const slices = items.map((item, index) => {
    const sweep = (item.value / total) * Math.PI * 2;
    const start = -Math.PI / 2 + (index === 0 ? 0 : (offsets[index - 1] ?? 0));
    const end = start + sweep;
    const large = sweep > Math.PI ? 1 : 0;
    const path = [
      `M${centre + radius * Math.cos(start)},${centre + radius * Math.sin(start)}`,
      `A${radius},${radius} 0 ${large} 1 ${centre + radius * Math.cos(end)},${centre + radius * Math.sin(end)}`,
      `L${centre + inner * Math.cos(end)},${centre + inner * Math.sin(end)}`,
      `A${inner},${inner} 0 ${large} 0 ${centre + inner * Math.cos(start)},${centre + inner * Math.sin(start)}`,
      "Z",
    ].join(" ");
    return {
      path,
      color: CHART_COLORS[index % CHART_COLORS.length] ?? theme.primary,
      item,
    };
  });

  return (
    <Row gap={14} align="center" wrap>
      <Svg width={size} height={size} accessibilityLabel={label}>
        {slices.map((slice) => (
          <Path key={slice.item.id} d={slice.path} fill={slice.color} />
        ))}
      </Svg>
      <Col gap={5} style={{ flex: 1, minWidth: 140 }}>
        {slices.map((slice) => (
          <Row key={slice.item.id} gap={6}>
            <View
              style={{
                width: 9,
                height: 9,
                borderRadius: 2,
                backgroundColor: slice.color,
              }}
            />
            <A size={11} numberOfLines={1} style={{ flex: 1 }}>
              {slice.item.label}
            </A>
            <A size={11} weight="600" color={theme.muted}>
              {`${Math.round((slice.item.value / total) * 100)}%`}
            </A>
          </Row>
        ))}
      </Col>
    </Row>
  );
}

/** Horizontal ranked bars: top products, categories, payment mix. */
export function RankBars({
  items,
  theme,
  format,
  color,
}: {
  items: RankedItem[];
  theme: AdminTheme;
  format: (value: number) => string;
  color?: string;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));
  if (!items.length) {
    return (
      <A size={12} color={theme.muted}>
        Nothing to rank yet.
      </A>
    );
  }
  return (
    <Col gap={9}>
      {items.map((item, index) => (
        <Col key={item.id} gap={4}>
          <Row justify="space-between" gap={8}>
            <A size={12} numberOfLines={1} style={{ flex: 1 }}>
              {item.label}
            </A>
            <A size={12} weight="600">
              {format(item.value)}
            </A>
          </Row>
          <View
            style={{
              height: 6,
              borderRadius: 3,
              backgroundColor: theme.background,
            }}
          >
            <View
              style={{
                width: `${Math.max(2, (item.value / max) * 100)}%`,
                height: 6,
                borderRadius: 3,
                backgroundColor:
                  color ?? CHART_COLORS[index % CHART_COLORS.length],
              }}
            />
          </View>
        </Col>
      ))}
    </Col>
  );
}

export function Funnel({
  steps,
  theme,
}: {
  steps: { label: string; value: number }[];
  theme: AdminTheme;
}) {
  const first = steps[0]?.value ?? 0;
  return (
    <Col gap={10}>
      {steps.map((step, index) => {
        const previous = steps[index - 1]?.value ?? step.value;
        const share = first > 0 ? (step.value / first) * 100 : 0;
        const dropOff =
          previous > 0 ? ((previous - step.value) / previous) * 100 : 0;
        return (
          <Col key={step.label} gap={4}>
            <Row justify="space-between" gap={8}>
              <A size={12}>{step.label}</A>
              <Row gap={8}>
                <A size={12} weight="600">
                  {step.value.toLocaleString()}
                </A>
                {index > 0 && (
                  <A
                    size={11}
                    color={dropOff > 60 ? theme.danger : theme.muted}
                  >
                    {`-${dropOff.toFixed(0)}%`}
                  </A>
                )}
              </Row>
            </Row>
            <View
              style={{
                height: 22,
                borderRadius: 5,
                backgroundColor: theme.background,
              }}
            >
              <View
                style={{
                  width: `${Math.max(2, share)}%`,
                  height: 22,
                  borderRadius: 5,
                  backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                }}
              />
            </View>
          </Col>
        );
      })}
    </Col>
  );
}
