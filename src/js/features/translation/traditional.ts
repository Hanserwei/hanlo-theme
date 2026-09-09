import { ConverterBuilder } from "opencc-js/core";
import { configs, from, to } from "opencc-js/preset/cn2t";

// Retain OpenCC's phrase segmentation and normalization while allowing other locales to shake out.
export const convert = ConverterBuilder({
  from: { cn: from.cn },
  to: { tw: to.tw },
  configs: { s2tw: configs.s2tw },
})({ from: "cn", to: "tw" });
