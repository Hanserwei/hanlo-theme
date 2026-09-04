const storageKey = "hanlo-e2e-module-one";
const executions = Number.parseInt(sessionStorage.getItem(storageKey) ?? "0", 10) + 1;
sessionStorage.setItem(storageKey, String(executions));
document.documentElement.dataset.hanloModulePage = "one";
document.documentElement.dataset.hanloModuleExecutions = "1";
