export const CONTROL_BAR_HEIGHT = 79;
export const CONTROL_BAR_RADIUS = 26;
export const EPISODES_TAB_HEIGHT = 37;
/** Width of the tab where it meets the bottom edge of the bar, curves included. */
export const EPISODES_TAB_BASE_WIDTH = 202;
/** Horizontal run of each S-curve that lifts the tab out of the bar's bottom edge. */
const TAB_SHOULDER_WIDTH = 38;
const TAB_CURVE_BOTTOM = 19;
const TAB_CURVE_TOP = 25;
// Keeps the 1px outline fully inside the element it is drawn over.
const STROKE_INSET = 0.5;

export interface ControlBarPaths {
  /** Closed outline of the whole bar, tab included. Used for the outline and to clip the glass. */
  outline: string;
  /** Closed shape of the tab alone, for its lighter fill. Null when the bar has no tab. */
  tabFill: string | null;
}

/**
 * Builds the shape of the touch control bar: a rounded rectangle whose bottom edge lifts into a
 * centered tab (the Episodes handle) through two S-curves, so the outline flows into the tab.
 * Drawn from the measured width because CSS cannot express the curves responsively.
 */
export function buildControlBarPaths(width: number, hasTab: boolean): ControlBarPaths {
  const left = STROKE_INSET;
  const top = STROKE_INSET;
  const right = width - STROKE_INSET;
  const bottom = CONTROL_BAR_HEIGHT - STROKE_INSET;
  const radius = CONTROL_BAR_RADIUS - STROKE_INSET;

  const topAndRightEdges = `M ${left + radius} ${top} H ${right - radius} A ${radius} ${radius} 0 0 1 ${right} ${top + radius} V ${bottom - radius} A ${radius} ${radius} 0 0 1 ${right - radius} ${bottom}`;
  const leftEdge = `H ${left + radius} A ${radius} ${radius} 0 0 1 ${left} ${bottom - radius} V ${top + radius} A ${radius} ${radius} 0 0 1 ${left + radius} ${top} Z`;

  const canFitTab = hasTab && width >= EPISODES_TAB_BASE_WIDTH + 2 * CONTROL_BAR_RADIUS;

  if (!canFitTab) {
    return { outline: `${topAndRightEdges} ${leftEdge}`, tabFill: null };
  }

  const center = width / 2;
  const baseHalf = EPISODES_TAB_BASE_WIDTH / 2;
  const topHalf = baseHalf - TAB_SHOULDER_WIDTH;
  const tabTop = bottom - EPISODES_TAB_HEIGHT;

  const risingRight = `C ${center + baseHalf - TAB_CURVE_BOTTOM} ${bottom} ${center + topHalf + TAB_CURVE_TOP} ${tabTop} ${center + topHalf} ${tabTop}`;
  const fallingLeft = `C ${center - topHalf - TAB_CURVE_TOP} ${tabTop} ${center - baseHalf + TAB_CURVE_BOTTOM} ${bottom} ${center - baseHalf} ${bottom}`;
  const risingLeft = `C ${center - baseHalf + TAB_CURVE_BOTTOM} ${bottom} ${center - topHalf - TAB_CURVE_TOP} ${tabTop} ${center - topHalf} ${tabTop}`;
  const fallingRight = `C ${center + topHalf + TAB_CURVE_TOP} ${tabTop} ${center + baseHalf - TAB_CURVE_BOTTOM} ${bottom} ${center + baseHalf} ${bottom}`;

  return {
    outline: `${topAndRightEdges} H ${center + baseHalf} ${risingRight} H ${center - topHalf} ${fallingLeft} ${leftEdge}`,
    tabFill: `M ${center - baseHalf} ${bottom} ${risingLeft} H ${center + topHalf} ${fallingRight} Z`,
  };
}
