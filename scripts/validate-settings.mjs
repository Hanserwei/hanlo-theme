import { readFileSync } from "node:fs";

import { parseAllDocuments } from "yaml";

import { collectSettingsFields, validateSettingsForm } from "./settings-schema.mjs";

function documents(file) {
  return parseAllDocuments(readFileSync(file, "utf8"), { uniqueKeys: true }).map((document) => {
    if (document.errors.length) throw new Error(`${file}: ${document.errors[0].message}`);
    return document.toJS();
  });
}

const [settings] = documents("settings.yaml");
const annotations = documents("annotation-setting.yaml");
const forms = settings.spec.forms;
const errors = [];
const counts = { groups: forms.length, annotations: annotations.length, fields: 0, conditions: 0 };
const ids = new Map();
const groups = new Set();

for (const form of forms) {
  if (groups.has(form.group)) errors.push(`Duplicate settings group ${form.group}`);
  groups.add(form.group);
  const result = validateSettingsForm(form.formSchema, `/${form.group}`);
  errors.push(...result.errors);
  counts.fields += result.fields;
  counts.conditions += result.conditions;
  for (const { node, path } of collectSettingsFields(form.formSchema, `/${form.group}`)) {
    if (!node.id) continue;
    if (ids.has(node.id)) errors.push(`${path}: ID ${node.id} also exists in ${ids.get(node.id)}`);
    else ids.set(node.id, path);
  }
}
for (const annotation of annotations) {
  const result = validateSettingsForm(annotation.spec.formSchema, `/${annotation.metadata.name}`);
  errors.push(...result.errors);
  counts.fields += result.fields;
  counts.conditions += result.conditions;
}
if (errors.length) throw new Error(`Settings interaction validation failed:\n${errors.join("\n")}`);
console.log(
  `Verified ${counts.groups} settings groups, ${counts.annotations} annotation forms, ${counts.fields} inputs and ${counts.conditions} visibility conditions.`,
);
