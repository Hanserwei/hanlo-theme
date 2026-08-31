interface HanloProbeEvent {
  readonly type: string;
  readonly direction: string;
  readonly source: string;
  readonly url: string;
}

interface HanloProbeStats {
  cleanups: number;
  clicks: number;
  events: HanloProbeEvent[];
  intervalTicks: number;
  mounts: number;
  observerDisconnects: number;
  unmounts: number;
}

declare global {
  interface Window {
    __hanloProbe: HanloProbeStats;
    __hanloLiveEvents: HanloProbeEvent[];
    __newPageDestroyCount: number;
  }
}

export {};
