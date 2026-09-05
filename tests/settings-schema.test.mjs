import assert from "node:assert/strict";
import { test } from "node:test";

import { collectSettingsFields, validateSettingsForm } from "../scripts/settings-schema.mjs";

const guide = { $el: "div", attrs: { class: "hanlo-settings-guide" }, children: "说明" };
const switchField = { $formkit: "switch", name: "enabled", id: "section_enabled", label: "启用" };

test("UI wrappers preserve configuration paths and do not add stored groups", () => {
  const fields = collectSettingsFields(
    [
      { $el: "details", children: [{ $formkit: "text", name: "title", label: "标题" }] },
      {
        $formkit: "array",
        name: "links",
        label: "链接",
        children: [{ $formkit: "url", name: "url", label: "地址" }],
      },
    ],
    "/nav",
  );
  assert.deepEqual(
    fields.map(({ path }) => path),
    ["/nav/title", "/nav/links", "/nav/links/*/url"],
  );
});

test("section switches resolve scoped IDs and preserve conditional values", () => {
  const result = validateSettingsForm([
    guide,
    switchField,
    {
      $formkit: "text",
      name: "title",
      label: "标题",
      if: "$get(section_enabled).value",
      preserve: true,
    },
  ]);
  assert.deepEqual(result.errors, []);
  assert.equal(result.conditions, 1);
});

test("unresolved and duplicated IDs fail validation", () => {
  const result = validateSettingsForm([
    guide,
    switchField,
    { $formkit: "switch", name: "second", id: "section_enabled", label: "第二项" },
    { $formkit: "text", name: "title", label: "标题", if: "$get(missing).value", preserve: true },
  ]);
  assert.ok(result.errors.some((error) => error.includes("duplicate input ID")));
  assert.ok(result.errors.some((error) => error.includes("missing ID missing")));
});

test("array visibility must use local row values, not repeated global IDs", () => {
  const children = [
    { $formkit: "radio", name: "kind", id: "repeated_kind", label: "类型" },
    {
      $formkit: "text",
      name: "icon",
      label: "图标",
      if: "$get(repeated_kind).value == 'icon'",
      preserve: true,
    },
  ];
  const nodes = [guide, { $formkit: "array", name: "social", label: "社交", children }];
  assert.ok(validateSettingsForm(nodes).errors.some((error) => error.includes("repeated ID")));
  children[1].if = "$value.kind == 'icon'";
  assert.deepEqual(validateSettingsForm(nodes).errors, []);
});

test("row conditions cannot read nonexistent sibling fields", () => {
  const nodes = [
    guide,
    {
      $formkit: "repeater",
      name: "cards",
      label: "卡片",
      children: [
        {
          $formkit: "text",
          name: "body",
          label: "正文",
          if: "$value.missing == 'custom'",
          preserve: true,
        },
      ],
    },
  ];
  assert.ok(
    validateSettingsForm(nodes).errors.some((error) => error.includes("unknown row field missing")),
  );
});

test("hiding input without value preservation is rejected", () => {
  const result = validateSettingsForm([
    guide,
    switchField,
    {
      $formkit: "text",
      name: "title",
      label: "标题",
      if: "$get(section_enabled).value",
    },
  ]);
  assert.ok(result.errors.some((error) => error.includes("preserve")));
});

test("images require a preview ratio and useful help; numeric ranges cannot invert", () => {
  const result = validateSettingsForm([
    guide,
    { $formkit: "attachment", name: "cover", label: "封面" },
    { $formkit: "number", name: "count", label: "数量", min: 10, max: 1 },
  ]);
  assert.ok(result.errors.some((error) => error.includes("preview aspect ratio")));
  assert.ok(result.errors.some((error) => error.includes("minimum exceeds maximum")));
});

test("alternative controls may share one stored path when both are conditional", () => {
  const result = validateSettingsForm([
    guide,
    switchField,
    {
      $formkit: "text",
      name: "icon",
      label: "名称",
      if: "$get(section_enabled).value",
      preserve: true,
    },
    {
      $formkit: "iconify",
      name: "icon",
      label: "图标",
      if: "!$get(section_enabled).value",
      preserve: true,
    },
  ]);
  assert.deepEqual(result.errors, []);
});

test("annotation string booleans and explicit inherit option stay distinct", () => {
  const result = validateSettingsForm([
    guide,
    {
      $formkit: "radio",
      name: "override",
      label: "覆盖",
      options: [
        { label: "跟随设置", value: "" },
        { label: "开", value: "true" },
        { label: "关", value: "false" },
      ],
    },
  ]);
  assert.deepEqual(result.errors, []);
});
