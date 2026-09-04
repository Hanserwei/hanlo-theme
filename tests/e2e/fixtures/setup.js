const probeStorageKey = "hanlo-e2e-probe";

function emptyProbe() {
  return {
    cleanups: 0,
    clicks: 0,
    documents: 0,
    events: [],
    mounts: 0,
    observerDisconnects: 0,
    unmounts: 0,
  };
}

function readProbe() {
  try {
    return JSON.parse(sessionStorage.getItem(probeStorageKey) ?? "null") ?? emptyProbe();
  } catch {
    return emptyProbe();
  }
}

function updateProbe(update) {
  const probe = readProbe();
  update(probe);
  sessionStorage.setItem(probeStorageKey, JSON.stringify(probe));
  window.__hanloProbe = probe;
}

window.__hanloCurrentMounts = 0;
updateProbe((probe) => probe.documents++);

for (const type of [
  "hanlo:page:initial",
  "hanlo:page:leave",
  "hanlo:page:destroy",
  "hanlo:page:restore",
  "hanlo:page:error",
]) {
  document.addEventListener(type, (event) => {
    updateProbe((probe) => {
      probe.events.push({
        type,
        direction: event.detail.navigation.direction,
        source: event.detail.navigation.source,
        url: event.detail.navigation.url,
      });
    });
  });
}

void import("/src/js/entries/main.ts")
  .then(() => {
    window.HanloLifecycle.register({
      name: "e2e-probe",
      create: ({ resources }) => ({
        mount: () => {
          window.__hanloCurrentMounts++;
          updateProbe((probe) => probe.mounts++);
          resources.listen(document, "hanlo:e2e:probe", () => {
            updateProbe((probe) => probe.clicks++);
          });
          resources.observe({
            disconnect: () => updateProbe((probe) => probe.observerDisconnects++),
          });
          resources.track({ name: "third-party" }, () => {
            updateProbe((probe) => probe.cleanups++);
          });
        },
        unmount: () => {
          updateProbe((probe) => probe.unmounts++);
        },
      }),
    });
  })
  .catch((error) => {
    document.documentElement.dataset.hanloSetupError =
      error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  });
