import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const VARIABLE = "EXPO_PUBLIC_API_BASE_URL";

export function validPreviewApiBaseUrl(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "https:" && Boolean(parsed.hostname) &&
      !parsed.username && !parsed.password && !parsed.search &&
      !parsed.hash && parsed.pathname === "/";
  } catch {
    return false;
  }
}

export function preflightPreviewUpdate(readVariable, expectedValue) {
  const value = readVariable();
  if (!validPreviewApiBaseUrl(value) || !validPreviewApiBaseUrl(expectedValue) || value.trim() !== expectedValue.trim()) {
    throw new Error(`ERROR: ${VARIABLE} is required in the EAS preview environment as a valid HTTPS base URL matching the preview build profile. Preview update aborted.`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const easConfig = JSON.parse(readFileSync(new URL("../eas.json", import.meta.url), "utf8"));
    const expectedValue = easConfig.build?.preview?.env?.[VARIABLE];
    preflightPreviewUpdate(() => {
      const command = process.platform === "win32" ? "cmd.exe" : "eas";
      const args = process.platform === "win32"
        ? ["/d", "/s", "/c", `eas.cmd env:get preview --variable-name ${VARIABLE} --format short --non-interactive`]
        : ["env:get", "preview", "--variable-name", VARIABLE, "--format", "short", "--non-interactive"];
      const result = spawnSync(command, args, { encoding: "utf8", windowsHide: true });
      if (result.error || result.status !== 0) {
        throw new Error(`ERROR: Could not read ${VARIABLE} from the EAS preview environment. Preview update aborted.`);
      }
      const line = result.stdout.trim();
      const prefix = `${VARIABLE}=`;
      return line.startsWith(prefix) ? line.slice(prefix.length) : undefined;
    }, expectedValue);
    console.log(`${VARIABLE} is present and valid in the EAS preview environment.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : `ERROR: ${VARIABLE} preflight failed. Preview update aborted.`);
    process.exitCode = 1;
  }
}
