import type { PageResourceScope } from "../../core/resource-scope";

const SECOND = 1_000;
const DAY = 86_400 * SECOND;
const VOYAGER_LAUNCH = Date.parse("1977-09-05T12:56:00Z");
const VOYAGER_KILOMETERS_PER_SECOND = 17;
const ASTRONOMICAL_UNIT_KILOMETERS = 149_597_870.7;
const numberFormat = new Intl.NumberFormat("zh-CN");

export function footerUptime(startedAt: string, now: number): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startedAt);
  if (!match || !Number.isFinite(now)) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const start = new Date(year, month, day);
  if (start.getFullYear() !== year || start.getMonth() !== month || start.getDate() !== day) {
    return null;
  }
  const elapsed = Math.max(0, now - start.getTime());
  const days = Math.floor(elapsed / DAY);
  const hours = Math.floor(elapsed / (3_600 * SECOND)) % 24;
  const minutes = Math.floor(elapsed / (60 * SECOND)) % 60;
  const seconds = Math.floor(elapsed / SECOND) % 60;
  return `本站居然运行了 ${days} 天 ${hours} 小时 ${minutes} 分 ${seconds} 秒`;
}

export function voyagerEstimate(now: number): { kilometers: number; astronomicalUnits: number } {
  const seconds = Math.max(0, Math.floor((now - VOYAGER_LAUNCH) / SECOND));
  const kilometers = seconds * VOYAGER_KILOMETERS_PER_SECOND;
  return { kilometers, astronomicalUnits: kilometers / ASTRONOMICAL_UNIT_KILOMETERS };
}

export function mountFooterRecords(resources: PageResourceScope): void {
  const root = document.querySelector<HTMLElement>("[data-hanlo-footer-records]");
  if (!root) return;
  const uptime = root.querySelector<HTMLElement>("[data-footer-uptime]");
  const uptimeText = root.querySelector<HTMLElement>("[data-footer-uptime-text]");
  const voyager = root.querySelector<HTMLElement>("[data-footer-voyager]");
  if (!uptime && !voyager) return;

  const update = () => {
    if (document.hidden) return;
    const now = Date.now();
    if (uptime && uptimeText) {
      const text = footerUptime(root.dataset["startedAt"] ?? "", now);
      uptime.hidden = text === null;
      if (text) uptimeText.textContent = text;
    }
    if (voyager) {
      const { kilometers, astronomicalUnits } = voyagerEstimate(now);
      voyager.textContent = `旅行者 1 号飞行里程估算 ${numberFormat.format(kilometers)} 千米，约为 ${astronomicalUnits.toFixed(6)} 个天文单位 🚀`;
    }
  };

  update();
  resources.interval(update, SECOND);
  resources.listen(document, "visibilitychange", update);
}
