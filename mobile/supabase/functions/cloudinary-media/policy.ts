export function uploadTarget(
  body: Record<string, unknown>,
  userId: string,
  admin: boolean,
) {
  if (!admin) {
    if (body.folder || body.publicId || typeof body.dataUri === "string")
      throw new Error("Only store admins can upload library media.");
    if (
      typeof body.image !== "string" ||
      !/^data:image\/(jpeg|png|webp);base64,/.test(body.image)
    )
      throw new Error("Choose a JPEG, PNG or WebP profile photo.");
    return `gulmeli/avatars/${userId}`;
  }
  if (body.publicId) {
    if (
      typeof body.publicId !== "string" ||
      !/^gulmeli\/[a-z0-9_./-]{1,180}$/i.test(body.publicId) ||
      body.publicId.includes("..")
    )
      throw new Error("Invalid media reference.");
    return body.publicId;
  }
  const folder =
    typeof body.folder === "string" &&
    /^gulmeli\/[a-z0-9_-]{1,40}$/i.test(body.folder)
      ? body.folder
      : "gulmeli/media";
  return `${folder}/${crypto.randomUUID()}`;
}
export function signingText(params: Record<string, string>, secret: string) {
  return (
    Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join("&") + secret
  );
}
export function validDeletionId(id: unknown): id is string {
  return (
    typeof id === "string" &&
    /^gulmeli\/[a-z0-9_./-]{1,180}$/i.test(id) &&
    !id.includes("..")
  );
}
