import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (status: number, body: object) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS")
    return new Response(null, { headers: cors });
  if (request.method !== "POST") return reply(405, { error: "Use POST." });
  try {
    const authorization = request.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer "))
      return reply(401, { error: "Sign in to upload a photo." });
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const {
      data: { user },
      error,
    } = await client.auth.getUser(authorization.slice(7));
    if (error || !user)
      return reply(401, { error: "Your session expired. Sign in again." });
    const cloud = Deno.env.get("CLOUDINARY_CLOUD_NAME");
    const key = Deno.env.get("CLOUDINARY_API_KEY");
    const secret = Deno.env.get("CLOUDINARY_API_SECRET");
    if (!cloud || !key || !secret)
      return reply(503, { error: "Image uploads are not configured yet." });
    // Read with a hard cap even when Content-Length is absent or forged.
    const reader = request.body?.getReader();
    if (!reader) return reply(400, { error: "Choose a photo." });
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 2_100_000) {
        await reader.cancel();
        return reply(413, { error: "Choose a photo under 1.5 MB." });
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const body = JSON.parse(new TextDecoder().decode(bytes));
    const image = body.image;
    if (
      typeof image !== "string" ||
      !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(
        image,
      ) ||
      image.length > 2_000_100
    )
      return reply(400, {
        error: "Choose a JPEG, PNG or WebP photo under 1.5 MB.",
      });
    const { data: allowed, error: limitError } = await client.rpc(
      "reserve_image_upload",
    );
    if (limitError)
      return reply(503, {
        error: "Image service is unavailable. Try again later.",
      });
    if (!allowed)
      return reply(429, {
        error: "Photo upload limit reached. Try again in an hour.",
      });
    const params: Record<string, string> = {
      overwrite: "true",
      public_id: `gulmeli/avatars/${user.id}`,
      timestamp: String(Math.floor(Date.now() / 1000)),
    };
    const signingText =
      Object.keys(params)
        .sort()
        .map((k) => `${k}=${params[k]}`)
        .join("&") + secret;
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(signingText),
    );
    const signature = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const form = new FormData();
    for (const [name, value] of Object.entries(params))
      form.append(name, value);
    form.append("api_key", key);
    form.append("signature", signature);
    form.append("file", image);
    const uploaded = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/image/upload`,
      {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(30_000),
      },
    );
    const result = await uploaded.json();
    if (!uploaded.ok || typeof result.secure_url !== "string")
      return reply(502, {
        error: "Cloudinary could not save the photo. Please try again.",
      });
    return reply(200, { url: result.secure_url });
  } catch {
    return reply(400, {
      error: "The photo could not be uploaded. Please try again.",
    });
  }
});
