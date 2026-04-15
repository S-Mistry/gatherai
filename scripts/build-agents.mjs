import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const cwd = process.cwd();
const args = new Set(process.argv.slice(2));
const mode = args.has("--check") ? "check" : "write";

const root = cwd;
const guidePath = path.join(root, "docs", "agent-guide.md");
const outputPath = path.join(root, "AGENTS.md");
const claudeOutputPath = path.join(root, "CLAUDE.md");

const guide = fs.readFileSync(guidePath, "utf8").trim();

const docs = [
  {
    title: "PRD v1",
    path: "docs/prd-v1.md",
    summary: "Product requirements, scope, goals, and release criteria.",
  },
  {
    title: "Issue Log",
    path: "docs/issue-log.md",
    summary: "Confirmed repo-specific failures, root causes, and prevention checks.",
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

const claudeGenerated = generated.replace("# AGENTS\n", "# CLAUDE\n");

const targets = [
  { path: outputPath, content: generated, label: "AGENTS.md" },
  { path: claudeOutputPath, content: claudeGenerated, label: "CLAUDE.md" },
];

if (mode === "check") {
  let drift = false;
  for (const target of targets) {
    const existing = fs.existsSync(target.path)
      ? fs.readFileSync(target.path, "utf8")
      : null;
    if (existing !== target.content) {
      console.error(`${target.label} is out of date. Run \`npm run docs:sync\`.`);
      drift = true;
    }
  }
  if (drift) process.exit(1);
  console.log("AGENTS.md and CLAUDE.md are up to date.");
  process.exit(0);
}

for (const target of targets) {
  fs.writeFileSync(target.path, target.content);
  console.log(`Wrote ${path.relative(root, target.path)}`);
}
