import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const cwd = process.cwd();
const args = new Set(process.argv.slice(2));
const mode = args.has("--check") ? "check" : "write";

const root = cwd;
const guidePath = path.join(root, "docs", "agent-guide.md");
const outputPath = path.join(root, "AGENTS.md");

const guide = fs.readFileSync(guidePath, "utf8").trim();

const docs = [
  {
    title: "PRD v1",
    path: "docs/prd-v1.md",
    summary: "Product requirements, scope, goals, and release criteria.",
  },
  {
    title: "Technical Spec v1",
    path: "docs/technical-spec-v1.md",
    summary: "Implementation architecture, interfaces, data model, and delivery slices.",
  },
  {
    title: "Decision Log",
    path: "docs/decision-log.md",
    summary: "Locked product and technical defaults for MVP.",
  },
  {
    title: "Agent Guide Source",
    path: "docs/agent-guide.md",
    summary: "Human-maintained source used to generate this file.",
  },
];

const docIndex = docs
  .map(
    (doc) => `- [${doc.title}](${doc.path}) - ${doc.summary}`
  )
  .join("\n");

const generated = `<!-- GENERATED FILE. DO NOT EDIT DIRECTLY. -->
<!-- Source: docs/agent-guide.md -->
<!-- Regenerate with: npm run docs:sync -->

# AGENTS

## Canonical Docs
${docIndex}

${guide}
`;

if (mode === "check") {
  const existing = fs.existsSync(outputPath)
    ? fs.readFileSync(outputPath, "utf8")
    : null;

  if (existing !== generated) {
    console.error("AGENTS.md is out of date. Run `npm run docs:sync`.");
    process.exit(1);
  }

  console.log("AGENTS.md is up to date.");
  process.exit(0);
}

fs.writeFileSync(outputPath, generated);
console.log(`Wrote ${path.relative(root, outputPath)}`);
