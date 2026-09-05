import { compile } from "@formkit/core";

const collections = new Set(["array", "repeater", "list"]);

function nodesOf(value) {
  return Array.isArray(value) ? value.filter((node) => node && typeof node === "object") : [];
}

function rowNames(nodes) {
  return nodesOf(nodes).flatMap((node) =>
    node.$formkit && node.name ? [node.name] : rowNames(node.children),
  );
}

export function collectSettingsFields(nodes, root = "") {
  const fields = [];
  function visit(children, parent, row, hidden) {
    for (const node of nodesOf(children)) {
      const fieldPath = node.$formkit && node.name ? `${parent}/${node.name}` : parent;
      const condition = Boolean(hidden || node.if);
      if (node.$formkit) fields.push({ node, path: fieldPath, row, conditional: condition });
      const nextRow = collections.has(node.$formkit)
        ? { path: fieldPath, kind: node.$formkit, names: rowNames(node.children) }
        : row;
      const childPath = collections.has(node.$formkit) ? `${fieldPath}/*` : fieldPath;
      visit(node.children, childPath, nextRow, condition);
    }
  }
  visit(nodes, root, null, false);
  return fields;
}

export function validateSettingsForm(nodes, root = "", requireGuide = true) {
  const errors = [];
  const fields = collectSettingsFields(nodes, root);
  const ids = new Map();
  const paths = new Map();
  const conditions = [];
  const report = (path, text) => errors.push(`${path || root}: ${text}`);

  if (
    requireGuide &&
    !nodesOf(nodes).some((node) => node.attrs?.class === "hanlo-settings-guide")
  ) {
    report(root, "missing section guide");
  }
  for (const field of fields) {
    const { node, path, row } = field;
    if ((typeof node.name !== "string" || !node.name.trim()) && row?.kind !== "list") {
      report(path, "input needs a name");
    }
    if (typeof node.label !== "string" || !node.label.trim())
      report(path, "input needs a visible label");
    if (node.if && node.preserve !== true)
      report(path, "conditional input must preserve its value");
    if (node.id) {
      if (ids.has(node.id)) report(path, `duplicate input ID ${node.id}`);
      else ids.set(node.id, field);
    }
    const previous = paths.get(path);
    if (previous && (!node.if || !previous.if)) report(path, "duplicate unconditional field path");
    paths.set(path, node);
    if (node.$formkit === "attachment" && (!node.help || !node.aspectRatio)) {
      report(path, "image input needs guidance and a preview aspect ratio");
    }
    if (typeof node.min === "number" && typeof node.max === "number" && node.min > node.max) {
      report(path, "minimum exceeds maximum");
    }
    if (Array.isArray(node.options)) {
      const seen = new Set();
      for (const option of node.options) {
        const value = typeof option === "object" ? option.value : option;
        const key = `${typeof value}:${String(value)}`;
        if (seen.has(key)) report(path, `duplicate option value ${String(value)}`);
        seen.add(key);
      }
    }
    if (typeof node.if === "string") conditions.push({ expression: node.if, path, row });
  }

  function visitUi(children, parent, row) {
    for (const node of nodesOf(children)) {
      const fieldPath = node.$formkit && node.name ? `${parent}/${node.name}` : parent;
      if (!node.$formkit && typeof node.if === "string") {
        conditions.push({ expression: node.if, path: fieldPath, row });
      }
      if (
        node.$el === "a" &&
        node.attrs?.target === "_blank" &&
        !node.attrs.rel?.includes("noopener")
      ) {
        report(fieldPath, "new-tab help links must set rel=noopener");
      }
      const nextRow = collections.has(node.$formkit)
        ? { path: fieldPath, kind: node.$formkit, names: rowNames(node.children) }
        : row;
      visitUi(
        node.children,
        collections.has(node.$formkit) ? `${fieldPath}/*` : fieldPath,
        nextRow,
      );
    }
  }
  visitUi(nodes, root, null);

  for (const { expression, path, row } of conditions) {
    try {
      compile(expression);
    } catch (error) {
      report(
        path,
        `invalid FormKit expression: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    for (const match of expression.matchAll(/\$get\(\s*['"]?([\w-]+)['"]?\s*\)/g)) {
      const target = ids.get(match[1]);
      if (!target) report(path, `condition references missing ID ${match[1]}`);
      else if (target.row)
        report(path, `condition uses repeated ID ${match[1]}; use $value for row values`);
    }
    for (const match of expression.matchAll(/\$value\.([A-Za-z_]\w*)/g)) {
      if (!row || !row.names.includes(match[1])) {
        report(path, `condition references unknown row field ${match[1]}`);
      }
    }
  }
  return { errors, fields: fields.length, conditions: conditions.length };
}
