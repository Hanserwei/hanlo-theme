const storageKey = "hanlo-e2e-module-two";
const executions = Number.parseInt(sessionStorage.getItem(storageKey) ?? "0", 10) + 1;
sessionStorage.setItem(storageKey, String(executions));
document.documentElement.dataset.hanloModulePage = "two";
document.documentElement.dataset.hanloModuleExecutions = "1";
