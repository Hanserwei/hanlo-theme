import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { compile, createNode } from "@formkit/core";
import { parse } from "yaml";

import { collectSettingsFields } from "../scripts/settings-schema.mjs";

const settings = parse(readFileSync(new URL("../settings.yaml", import.meta.url), "utf8"));
const fields = settings.spec.forms.flatMap((form) =>
  collectSettingsFields(form.formSchema, `/${form.group}`),
);

function visible(path, values, row = {}, type) {
  const field = fields.find((item) => item.path === path && (!type || item.node.$formkit === type));
  assert.ok(field?.node.if, `No conditional control at ${path}`);
  const expression = compile(field.node.if).provide((requirements) =>
    Object.fromEntries(
      requirements.map((name) => [
        name,
        () => {
          if (name === "get") return (id) => ({ value: values[id] });
          if (name === "value") return row;
          if (name.startsWith("value.")) return row[name.slice(6)];
          throw new Error(`Unexpected expression input: ${name}`);
        },
      ]),
    ),
  );
  return Boolean(expression());
}

test("mobile-only left menus keep their menu picker available", () => {
  assert.equal(
    visible("/nav/leftMenu", { hanlo_nav_pc_leftMenu: false, hanlo_nav_phone_leftMenu: true }),
    true,
  );
  assert.equal(
    visible("/nav/leftMenu", { hanlo_nav_pc_leftMenu: false, hanlo_nav_phone_leftMenu: false }),
    false,
  );
});

test("hero image and video fields are mutually exclusive and hide when disabled", () => {
  for (const enabled of [true, false]) {
    for (const video of [true, false]) {
      const values = { hanlo_top_enable_above: enabled, hanlo_top_enable_above_video: video };
      assert.equal(visible("/top/above/index_video", values), enabled && video);
      assert.equal(visible("/top/above/index_img", values), enabled && !video);
    }
  }
});

test("About editors track selected sections using FormKit method-call syntax", () => {
  assert.equal(visible("/about/game", { hanlo_about_widget_list: ["game"] }), true);
  assert.equal(visible("/about/game", { hanlo_about_widget_list: ["hello-about"] }), false);
  assert.equal(visible("/about/game", { hanlo_about_widget_list: [] }), false);
  assert.equal(visible("/about/game", {}), false);
});

test("each social row independently selects its CSS or SVG input", () => {
  for (const side of ["socialMediaLeft", "socialMediaRight"]) {
    for (const mode of ["icon", "custom"]) {
      const path = `/footer/social_media/${side}/*/icon`;
      assert.equal(visible(path, {}, { option_social_data: mode }, "textarea"), mode === "icon");
      assert.equal(visible(path, {}, { option_social_data: mode }, "iconify"), mode === "custom");
    }
  }
});

test("code height requires both highlighting and height truncation", () => {
  for (const highlight of [true, false]) {
    for (const limit of [true, false]) {
      assert.equal(
        visible("/code/height_limit", {
          hanlo_code_shiki_enable: highlight,
          hanlo_code_enable_height_limit: limit,
        }),
        highlight && limit,
      );
    }
  }
});

test("remote AI setup is shown when the remote mode can actually be used", () => {
  const base = {
    hanlo_post_aiDescriptionEnable: true,
    hanlo_post_aiDescription_mode: "local",
    hanlo_post_aiDescription_switchBtn: false,
  };
  assert.equal(visible("/post/aiDescription/key", base), false);
  assert.equal(
    visible("/post/aiDescription/key", { ...base, hanlo_post_aiDescription_switchBtn: true }),
    true,
  );
  assert.equal(
    visible("/post/aiDescription/key", { ...base, hanlo_post_aiDescription_mode: "tianli" }),
    true,
  );
});

test("preserve retains configured content when a conditional input unmounts", () => {
  const form = createNode({ type: "group", value: { title: "已有内容" } });
  const input = createNode({ name: "title", parent: form, props: { preserve: true } });
  input.destroy();
  assert.equal(form.value.title, "已有内容");
  const restored = createNode({ name: "title", parent: form, props: { preserve: true } });
  assert.equal(restored.value, "已有内容");
  form.destroy();
});
