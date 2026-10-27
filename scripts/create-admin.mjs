import { z } from "zod";
import { randomUUID } from "node:crypto";
import { loadConfig } from "../server/config.mjs";
import { openStore } from "../server/store.mjs";
import { makeInitialState } from "../server/seed.mjs";
import { hashPassword } from "../server/auth.mjs";
const values = z
  .object({
    email: z.email(),
    password: z.string().min(12).max(128),
    name: z.string().min(1).max(80),
  })
  .parse({
    email: process.env.ADMIN_EMAIL?.toLowerCase(),
    password: process.env.ADMIN_PASSWORD,
    name: process.env.ADMIN_NAME || "Makanlah Admin",
  });
const config = loadConfig(),
  store = await openStore(config, makeInitialState(config.demoMode));
await store.transact((s) => {
  let user = s.users.find((u) => u.email === values.email);
  if (!user) {
    user = {
      id: randomUUID(),
      email: values.email,
      bio: "",
      city: "Kuala Lumpur",
      preferences: { cuisines: [], dietary: [], budget: 30, spicy: false },
      createdAt: new Date().toISOString(),
    };
    s.users.push(user);
  }
  Object.assign(user, {
    name: values.name,
    passwordHash: hashPassword(values.password),
    role: "admin",
    status: "active",
  });
  s.sessions = s.sessions.filter((x) => x.userId !== user.id);
});
await store.close();
console.log("Admin account is ready. Password was not logged.");
