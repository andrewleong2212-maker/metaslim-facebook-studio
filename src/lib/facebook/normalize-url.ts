const allowedHosts = new Set(["facebook.com", "www.facebook.com", "m.facebook.com", "web.facebook.com"]);

export function normalizeFacebookUrl(input: string) {
  const url = new URL(input.trim());
  const host = url.hostname.toLowerCase();
  if (!allowedHosts.has(host)) throw new Error("只接受 Facebook URL");
  url.protocol = "https:";
  url.hostname = "www.facebook.com";
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (!new Set(["id", "story_fbid", "v"]).has(key)) url.searchParams.delete(key);
  }
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  return url.toString();
}
