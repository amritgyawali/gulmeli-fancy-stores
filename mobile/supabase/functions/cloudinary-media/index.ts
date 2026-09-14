import { createClient } from "npm:@supabase/supabase-js@2";

// Authenticated media proxy for Cloudinary: signed uploads and deletions.
// The Cloudinary API secret never reaches the app; it stays in function
// secrets. Actions: {action:"upload", dataUri, folder?, publicId?} and
// {action:"delete", publicId}.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const MAX_BYTES = 11_000_000; // generous cap for documents and video clips
const IMAGE_LIMIT = 2_100_000; // avatars and photos via data URI stay small

const CLOUD_NAME = Deno.env.get("CLOUDINARY_CLOUD_NAME") ?? "";
const API_KEY = Deno.env.get("CLOUDINARY_API_KEY") ?? "";
const API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET") ?? "";

function sha1Hex(text: string): Promise<string> {
  return crypto.subtle
    .digest("SHA-1", new TextEncoder().encode(text))
    .then((digest) =>
      Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
    );
}

async function readCapped(request: Request, cap: number) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("empty");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > cap) {
      await reader.cancel();
      throw new Error("too-large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(bytes);
}

async function authenticate(request: Request) {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const { data, error } = await client.auth.getUser(authorization.slice(7));
  if (error || !data.user) return null;
  return { user: data.user, client };
}

function resourceType(dataUri: string) {
  if (/^data:image\//.test(dataUri)) return "image";
  if (/^data:video\//.test(dataUri)) return "video";
  return "raw";
}

async function handleUpload(
  body: Record<string, unknown>,
  userId: string,
  client: ReturnType<typeof createClient>,
) {
  const dataUri = body.dataUri ?? body.image;
  if (
    typeof dataUri !== "string" ||
    !/^data:[^;]+;base64,[A-Za-z0-9+/=\s]+$/.test(dataUri) ||
    dataUri.length > MAX_BYTES
  )
    return reply(400, {
      error: "The file could not be read. Choose a file under 10 MB.",
    });
  const isImage = /^data:image\//.test(dataUri);
  if (isImage && dataUri.length > IMAGE_LIMIT && !body.folder)
    return reply(413, {
      error: "Choose a profile photo under 1.5 MB.",
    });
  const rawFolder =
    typeof body.folder === "string" ? body.folder.trim() : "gulmeli/misc";
  const folder = /^gulmeli\/[a-z0-9_-]{1,40}$/i.test(rawFolder)
    ? rawFolder
    : `gulmeli/uploads`;
  const { data: allowed } = await client.rpc("reserve_image_upload");
  if (!allowed)
    return reply(429, {
      error: "Upload limit reached. Try again in an hour.",
    });
  const publicId =
    typeof body.publicId === "string" &&
    /^[a-z0-9_\/-]{3,140}$/i.test(body.publicId)
      ? body.publicId
      : `${folder}/${userId}-${Date.now().toString(36)}`;
  const params: Record<string, string> = {
    public_id: publicId,
    overwrite: "true",
    timestamp: String(Math.floor(Date.now() / 1000)),
  };
  const signature = await sha1Hex(
    Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join("&") + API_SECRET,
  );
  const form = new FormData();
  for (const [name, value] of Object.entries(params)) form.append(name, value);
  form.append("api_key", API_KEY);
  form.append("signature", signature);
  form.append("file", dataUri);
  const uploaded = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(CLOUD_NAME)}/${resourceType(dataUri)}/upload`,
    { method: "POST", body: form, signal: AbortSignal.timeout(60_000) },
  );
  const result = await uploaded.json();
  if (!uploaded.ok || typeof result.secure_url !== "string")
    return reply(502, {
      error:
        typeof result?.error?.message === "string"
          ? `Cloudinary: ${result.error.message}`
          : "Cloudinary could not save the file. Please try again.",
    });
  return reply(200, {
    url: result.secure_url,
    publicId: result.public_id ?? null,
    width: result.width ?? 0,
    height: result.height ?? 0,
    bytes: result.bytes ?? 0,
    kind:
      result.resource_type === "video"
        ? "video"
        : String(result.format ?? "").toLowerCase() === "pdf"
          ? "pdf"
          : result.resource_type === "raw"
            ? "document"
            : "image",
    name:
      typeof result.public_id === "string"
        ? result.public_id.split("/").pop()
        : "file",
  });
}

async function handleDelete(body: Record<string, unknown>, client: any) {
  const publicId = body.publicId;
  if (typeof publicId !== "string" || !/^[a-z0-9_.-]{3,140}$/i.test(publicId))
    return reply(400, { error: "Invalid media reference." });
  if (!publicId.startsWith("gulmeli/"))
    return reply(403, {
      error: "Only files uploaded through this app can be deleted.",
    });
  // Admin membership check (definer function bypasses RLS recursion).
  const { data: isAdmin } = await client.rpc("is_admin");
  if (!isAdmin)
    return reply(403, { error: "Only store admins can delete media." });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = await sha1Hex(`public_id=${publicId}${timestamp}${API_SECRET}`);
  let destroyed: Response | null = null;
  let result: any = null;
  for (const type of ["image", "video", "raw"]) {
    const form = new FormData();
    form.append("api_key", API_KEY);
    form.append("timestamp", timestamp);
    form.append("signature", signature);
    form.append("public_id", publicId);
    form.append("invalidation", "true");
    destroyed = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(CLOUD_NAME)}/${type}/destroy`,
      { method: "POST", body: form, signal: AbortSignal.timeout(30_000) },
    );
    result = await destroyed.json().catch(() => null);
    if (destroyed.ok && result?.result === "ok") break;
  }
  if (!destroyed?.ok || result?.result !== "ok")
    return reply(502, { error: "Cloudinary could not delete the file." });
  return reply(200, { result: "ok" });
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "POST") return reply(405, { error: "Use POST." });
  if (!CLOUD_NAME || !API_KEY || !API_SECRET)
    return reply(503, { error: "Media storage is not configured yet." });
  try {
    const auth = await authenticate(request);
    if (!auth) return reply(401, { error: "Sign in to manage media." });
    const text = await readCapped(request, MAX_BYTES + 2_000);
    if (text === "too-large") return reply(413, { error: "File too large." });
    const body = JSON.parse(text);
    if (typeof body !== "object" || body === null)
      return reply(400, { error: "Invalid request." });
    if (body.action === "delete")
      return await handleDelete(body, auth.client);
    return await handleUpload(body, auth.user.id, auth.client);
  } catch (error) {
    if (error instanceof Error && error.message === "too-large")
      return reply(413, { error: "File too large." });
    return reply(400, { error: "The request could not be processed." });
  }
});
