export const PRIMARY_ORANGE = '#F56600';
export const DEEP_PURPLE = '#522D80';
export const DARK_PURPLE = '#2E1A47';
export const DARK_ORANGE = '#B94700';
export const ROYAL_BLUE = '#005EB8';
export const OLIVE = '#546223';

export function getChartColors(dark) {
  return {
    text: dark ? '#d1d5db' : '#333333',
    subText: dark ? '#9ca3af' : '#8C8279',
    splitLine: dark ? '#374151' : '#f3f4f6',
    tooltipBg: dark ? DARK_PURPLE : '#fff',
    tooltipBorder: dark ? '#374151' : '#CBC4BC',
    tooltipText: dark ? '#f3f4f6' : '#333333',
    dataZoomBorder: dark ? '#4b5563' : '#CBC4BC',
    dataZoomFill: dark ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.15)',
    primary: '#3b82f6',
    secondary: DEEP_PURPLE,
  };
}
