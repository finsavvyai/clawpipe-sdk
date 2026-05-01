# Security policy

## Reporting a vulnerability

Use GitHub's private vulnerability reporting on this repository: open the
**Security** tab and click **Report a vulnerability**. We aim to acknowledge
within two business days. Please do not file public GitHub issues for security
reports.

## Supported versions

Security fixes are issued for the current minor version of `clawpipe-ai` on
npm.

## What runs where

The `clawpipe-ai` SDK runs in your process. Booster, Packer, and the
exact-match prompt cache execute locally; prompt content for those stages does
not leave your machine.

Other stages — the hosted multi-provider gateway, semantic cache, router
weight sync, and telemetry — can be configured to call the ClawPipe control
plane over TLS. Each is independently toggleable in the `ClawPipe` config; if
a stage is disabled, no data for that stage is sent.

## Semantic cache and prompt content

When the semantic cache is enabled, prompt embeddings — not plaintext — are
stored on the control plane to support similarity lookup. Embeddings are
derived representations and should not be assumed to be irreversible; if your
prompts contain regulated data, leave the semantic cache disabled.

## Compliance

ClawPipe does not currently hold third-party security certifications (SOC 2,
ISO 27001, etc.). Status updates will be published here as our compliance
program matures.

## Encryption

Traffic to the ClawPipe control plane uses TLS.
