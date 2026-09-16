import { createHash, randomUUID } from "node:crypto";
import { serverEnv } from "./backend-env.mjs";
const cloud = serverEnv.CLOUDINARY_CLOUD_NAME;
const id = `gulmeli/verification/${randomUUID()}`;
async function request(action, params, file) {
  params.timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHash("sha1")
    .update(
      Object.keys(params)
        .sort()
        .map((k) => `${k}=${params[k]}`)
        .join("&") + serverEnv.CLOUDINARY_API_SECRET,
    )
    .digest("hex");
  const form = new FormData();
  for (const [key, value] of Object.entries(params)) form.append(key, value);
  form.append("api_key", serverEnv.CLOUDINARY_API_KEY);
  form.append("signature", signature);
  if (file) form.append("file", file);
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloud}/image/${action}`,
    { method: "POST", body: form, signal: AbortSignal.timeout(30000) },
  );
  const result = await response.json();
  if (!response.ok)
    throw Error(`Cloudinary ${action} returned ${response.status}`);
  return result;
}
let uploaded = false;
try {
  const result = await request(
    "upload",
    { public_id: id, overwrite: "false" },
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP1sAAAAASUVORK5CYII=",
  );
  uploaded = true;
  const image = await fetch(result.secure_url, {
    signal: AbortSignal.timeout(15000),
  });
  if (!image.ok || !image.headers.get("content-type")?.startsWith("image/"))
    throw Error("Cloudinary image delivery failed");
  console.log("PASS: signed upload and public image delivery.");
} finally {
  if (uploaded) {
    const result = await request("destroy", {
      invalidate: "true",
      public_id: id,
    });
    if (result.result !== "ok") throw Error("Test asset cleanup failed: " + id);
    console.log("PASS: signed delete. Verification asset removed.");
  }
}
