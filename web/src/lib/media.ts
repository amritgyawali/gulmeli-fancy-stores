// Media in this store always lives in Cloudinary; the authenticated
// cloudinary-media edge function signs every upload/delete.
import { cloudName, supabase } from "./supabase";

export interface MediaUploadResult {
  url: string;
  publicId: string | null;
  width: number;
  height: number;
  bytes: number;
  kind: string;
  name: string;
}

async function invoke(body: object): Promise<MediaUploadResult> {
  const { data, error } = await supabase.functions.invoke("cloudinary-media", {
    body,
  });
  if (error) {
    let message = "The media service is unavailable. Please try again.";
    if (error.context instanceof Response) {
      const detail = await error.context.json().catch(() => null);
      if (typeof detail?.error === "string") message = detail.error;
    }
    throw new Error(message);
  }
  return data as MediaUploadResult;
}

const toDataUri = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("The file could not be read."));
    reader.readAsDataURL(file);
  });

export async function uploadMediaFile(
  file: File,
  options: { folder?: string; publicId?: string } = {},
): Promise<MediaUploadResult> {
  const dataUri = await toDataUri(file);
  const result = await invoke({
    action: "upload",
    dataUri,
    folder: options.folder ?? "gulmeli/media",
    ...(options.publicId ? { publicId: options.publicId } : {}),
  });
  if (typeof result?.url !== "string")
    throw new Error("Cloudinary did not return a file URL.");
  return result;
}

export async function uploadAvatar(
  dataUri: string,
  _userId: string,
): Promise<string> {
  if (!cloudName) throw new Error("Cloudinary cloud name is not configured.");
  // Same fixed public id the mobile app uses, so avatars overwrite in place
  // across both surfaces.
  const data = await invoke({
    action: "upload",
    image: dataUri,
  });
  if (
    typeof data?.url !== "string" ||
    !data.url.startsWith(`https://res.cloudinary.com/${cloudName}/`)
  )
    throw new Error(
      "The image service returned an unexpected URL. Check the Cloudinary configuration.",
    );
  return data.url;
}

/** Deletes an asset from Cloudinary (files uploaded through this app only). */
export async function deleteMediaFile(publicId: string | null): Promise<void> {
  if (!publicId) return;
  await invoke({ action: "delete", publicId });
}
