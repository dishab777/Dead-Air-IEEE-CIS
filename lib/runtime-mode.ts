export const isDryRun = process.env.DRY_RUN === "true" && process.env.NODE_ENV !== "production";
