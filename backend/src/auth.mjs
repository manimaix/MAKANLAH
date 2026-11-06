import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
export const hashToken = (token) =>
  createHash("sha256").update(token).digest("hex");
export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function checkPassword(password, encoded) {
  try {
    const [salt, hash] = encoded.split(":");
    const actual = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  } catch {
    return false;
  }
}
export function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}
export function publicAuthor(user) {
  return user
    ? { id: user.id, name: user.name, bio: user.bio, city: user.city }
    : null;
}
export function sessionToken(req) {
  const cookie = req.headers.cookie
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("makanlah_session="));
  return cookie?.slice("makanlah_session=".length) || "";
}
export const newToken = () => randomBytes(32).toString("hex");
