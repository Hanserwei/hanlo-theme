declare global {
  interface HanloProbeEvent {
    readonly type: string;
    readonly direction: string;
    readonly source: string;
    readonly url: string;
  }

  interface HanloProbeStats {
    cleanups: number;
    clicks: number;
    documents: number;
    events: HanloProbeEvent[];
    mounts: number;
    observerDisconnects: number;
    unmounts: number;
  }

  interface Window {
    __hanloProbe: HanloProbeStats;
    __hanloCurrentMounts: number;
    __hanloLiveEvents: HanloProbeEvent[];
    __hanloPerformance: { cls: number; lcp: number };
  }
}

export {};
