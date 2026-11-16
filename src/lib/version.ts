/** Version déployée : le commit Vercel, ou « dev » en local. */
export function appVersion(): string {
  return process.env.VERCEL_GIT_COMMIT_SHA ?? "dev";
}
