import { ConverterBuilder } from "opencc-js/core";
import { configs, from, to } from "opencc-js/preset/t2cn";

export const convert = ConverterBuilder({
  from: { tw: from.tw },
  to: { cn: to.cn },
  configs: { tw2s: configs.tw2s },
})({ from: "tw", to: "cn" });
