window.__hanloProbe = {
  cleanups: 0,
  clicks: 0,
  events: [],
  intervalTicks: 0,
  mounts: 0,
  observerDisconnects: 0,
  unmounts: 0,
};

for (const type of [
  "hanlo:page:initial",
  "hanlo:page:leave",
  "hanlo:page:destroy",
  "hanlo:page:enter",
  "hanlo:page:error",
]) {
  document.addEventListener(type, (event) => {
    window.__hanloProbe.events.push({
      type,
      direction: event.detail.navigation.direction,
      source: event.detail.navigation.source,
      url: event.detail.navigation.url,
    });
  });
}

window.pjax = new Pjax({
  elements: "a[data-pjax-test]",
  selectors: ["title", "#site-config", "#body-wrap"],
  analytics: false,
  cacheBust: false,
  scrollRestoration: false,
});

void import("/src/js/entries/main.ts").then(() => {
  window.HanloLifecycle.register({
    name: "e2e-probe",
    create: ({ resources }) => ({
      mount: () => {
        window.__hanloProbe.mounts++;
        resources.listen(document, "hanlo:e2e:probe", () => window.__hanloProbe.clicks++);
        resources.interval(() => window.__hanloProbe.intervalTicks++, 25);
        resources.observe({
          disconnect: () => window.__hanloProbe.observerDisconnects++,
        });
        resources.track({ name: "third-party" }, () => {
          window.__hanloProbe.cleanups++;
        });
      },
      unmount: () =>
        new Promise((resolve) => {
          window.setTimeout(() => {
            window.__hanloProbe.unmounts++;
            resolve();
          }, 50);
        }),
    }),
  });
});
