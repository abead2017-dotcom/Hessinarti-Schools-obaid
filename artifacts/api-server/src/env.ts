export const ENV = {
  jwtSecret: process.env.JWT_SECRET ?? process.env.SESSION_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
};
