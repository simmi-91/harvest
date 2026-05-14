import * as sandcastle from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";
import { execSync } from "node:child_process";

const MAX_ITERATIONS = 3;

const hooks = {
  sandbox: { onSandboxReady: [{ command: "npm install" }] },
};

const copyToWorktree = ["node_modules"];

for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
  console.log(`\n=== Iteration ${iteration}/${MAX_ITERATIONS} ===\n`);

  const branch = `sandcastle/sequential-reviewer/${Date.now()}`;

  const sandbox = await sandcastle.createSandbox({
    branch,
    sandbox: docker({
      mounts: [
        // Mount Claude Pro credentials so the claude CLI can authenticate
        // without an ANTHROPIC_API_KEY
        { hostPath: "~/.claude", sandboxPath: "~/.claude" },
      ],
    }),
    hooks,
    copyToWorktree,
  });

  try {
    const implement = await sandbox.run({
      name: "implementer",
      maxIterations: 100,
      agent: sandcastle.claudeCode("claude-sonnet-4-6"),
      promptFile: "./.sandcastle/implement-prompt.md",
    });

    if (!implement.commits.length) {
      console.log("Implementation agent made no commits. Skipping review.");
      continue;
    }

    console.log(`\nImplementation complete on branch: ${branch}`);
    console.log(`Commits: ${implement.commits.length}`);

    await sandbox.run({
      name: "reviewer",
      maxIterations: 1,
      agent: sandcastle.claudeCode("claude-sonnet-4-6"),
      promptFile: "./.sandcastle/review-prompt.md",
      promptArgs: {
        BRANCH: branch,
      },
    });

    console.log("\nReview complete.");

    try {
      execSync(`git push origin ${branch}`, { stdio: "inherit" });
      execSync(
        `gh pr create --base main --head ${branch} --title "Sandcastle: ${branch}" --body "Automated PR from Sandcastle sequential-reviewer."`,
        { stdio: "inherit" }
      );
      console.log("\nPR created.");
    } catch (err) {
      console.error("Failed to push or create PR:", err);
    }
  } finally {
    await sandbox.close();
  }
}

console.log("\nAll done.");
