import React from 'react';
import RadarChart, { RadarAxis } from '../intelligence/RadarChart';

interface GenomeRadialProps {
  vector: number[];
  dimensions: string[];
  isDark: boolean;
  compareVector?: number[];
  compareDimensions?: string[];
  primaryLabel?: string;
  compareLabel?: string;
}

export default function GenomeRadial({
  vector,
  dimensions,
  isDark,
  compareVector,
  compareLabel,
  primaryLabel,
}: GenomeRadialProps) {
  const axes: RadarAxis[] = dimensions.map((label, i) => ({ key: label, label, value: vector[i] ?? 0 }));
  const compareAxes: RadarAxis[] | undefined = compareVector
    ? dimensions.map((label, i) => ({ key: label, label, value: compareVector[i] ?? 0 }))
    : undefined;

  return (
    <RadarChart
      axes={axes}
      isDark={isDark}
      compareAxes={compareAxes}
      primaryLabel={primaryLabel}
      compareLabel={compareLabel}
      labelFontSize={8}
    />
  );
}
