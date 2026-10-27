export const staticPreview = import.meta.env.VITE_STATIC_PREVIEW === "true";

export function appPath(path: string) {
  return import.meta.env.BASE_URL + path.replace(/^\//, "");
}
