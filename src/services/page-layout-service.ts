export type PageLayoutBreakpoint = 'compact' | 'medium' | 'wide';

export interface PageLayoutState {
  owner: 'page';
  unit: 'cpx';
  baseWidth: 1024;
  containerWidthPx: number;
  scale: number;
  breakpoint: PageLayoutBreakpoint;
}

type Listener = (state: PageLayoutState) => void;

const BASE_WIDTH = 1024;
const MIN_CONTAINER_WIDTH = 320;
const DECIMAL_FACTOR = 1000;

const listeners = new Set<Listener>();

let state: PageLayoutState = {
  owner: 'page',
  unit: 'cpx',
  baseWidth: BASE_WIDTH,
  containerWidthPx: BASE_WIDTH,
  scale: 1,
  breakpoint: 'wide',
};

function roundToThree(value: number): number {
  return Math.round(value * DECIMAL_FACTOR) / DECIMAL_FACTOR;
}

function resolveBreakpoint(containerWidthPx: number): PageLayoutBreakpoint {
  if (containerWidthPx < 768) {
    return 'compact';
  }
  if (containerWidthPx < 1200) {
    return 'medium';
  }
  return 'wide';
}

function notify(): void {
  for (const listener of listeners) {
    listener(state);
  }
}

export function setContainerWidth(containerWidthPx: number): void {
  const normalizedWidth = Math.max(
    MIN_CONTAINER_WIDTH,
    Number.isFinite(containerWidthPx) ? containerWidthPx : state.containerWidthPx
  );
  const scale = roundToThree(normalizedWidth / BASE_WIDTH);
  const breakpoint = resolveBreakpoint(normalizedWidth);

  const changed =
    state.containerWidthPx !== normalizedWidth
    || state.scale !== scale
    || state.breakpoint !== breakpoint;

  if (!changed) {
    return;
  }

  state = {
    ...state,
    containerWidthPx: normalizedWidth,
    scale,
    breakpoint,
  };

  notify();
}

export function getState(): PageLayoutState {
  return { ...state };
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  listener(state);
  return () => {
    listeners.delete(listener);
  };
}

export function getBreakpoint(): PageLayoutBreakpoint {
  return state.breakpoint;
}

export function getScale(): number {
  return state.scale;
}

export function toPx(valueInCpx: number): number {
  return roundToThree(valueInCpx * state.scale);
}

export function toCpx(valueInPx: number): number {
  if (state.scale === 0) {
    return 0;
  }
  return roundToThree(valueInPx / state.scale);
}

export function validateContract(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (state.owner !== 'page') {
    errors.push('layout.owner must be "page"');
  }

  if (state.unit !== 'cpx') {
    errors.push('layout.unit must be "cpx"');
  }

  if (state.baseWidth !== BASE_WIDTH) {
    errors.push(`layout.baseWidth must be ${BASE_WIDTH}`);
  }

  if (state.containerWidthPx < MIN_CONTAINER_WIDTH) {
    errors.push(`containerWidthPx must be >= ${MIN_CONTAINER_WIDTH}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
