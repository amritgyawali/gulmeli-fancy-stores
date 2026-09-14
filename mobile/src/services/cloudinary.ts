import { backendConfig } from "./backend-config";
import { requireSupabase } from "./supabase";

// Every media file in the app (product photos, banners, icons, documents,
// avatars) is stored in Cloudinary. Supabase keeps only the URL and metadata.
// Uploads and deletions go through the authenticated `cloudinary-media` edge
// function, which signs requests with server-held API keys.

export interface MediaUploadResult {
  url: string;
  publicId: string | null;
  width: number;
  height: number;
  bytes: number;
  kind: string;
  name: string;
}

async function invoke(body: object): Promise<any> {
  const { data, error } = await requireSupabase().functions.invoke(
    "cloudinary-media",
    { body },
  );
  if (error) {
    let message = "The media service is unavailable. Please try again.";
    if (error.context instanceof Response) {
      const detail = await error.context.json().catch(() => null);
      if (typeof detail?.error === "string") message = detail.error;
    }
    throw new Error(message);
  }
  return data;
}

export async function uploadAvatar(dataUri: string): Promise<string> {
  if (!backendConfig.cloudName)
    throw new Error("Cloudinary cloud name is not configured.");
  const data = await invoke({ action: "upload", image: dataUri });
  if (
    typeof data?.url !== "string" ||
    !data.url.startsWith(
      `https://res.cloudinary.com/${backendConfig.cloudName}/`,
    )
  )
    throw new Error(
      "The image service returned an unexpected URL. Check the Cloudinary configuration.",
    );
  return data.url;
}

/** Uploads a picked file (data URI) to Cloudinary and returns its metadata. */
export async function uploadMediaFile(input: {
  dataUri: string;
  folder?: string;
  publicId?: string; // set to replace an existing asset in place
}): Promise<MediaUploadResult> {
  const data = await invoke({ action: "upload", ...input });
  if (typeof data?.url !== "string")
    throw new Error("Cloudinary did not return a file URL.");
  return data as MediaUploadResult;
}

/** Uploads a local file URI (React Native picker result) to Cloudinary. */
export async function uploadMediaFromUri(
  fileUri: string,
  options: { folder?: string; publicId?: string } = {},
): Promise<MediaUploadResult> {
  const response = await fetch(fileUri);
  const blob = await response.blob();
  const dataUri = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("The photo could not be read."));
    reader.readAsDataURL(blob);
  });
  return uploadMediaFile({ dataUri, ...options });
}

/** Deletes an asset from Cloudinary. Remote URLs are left untouched. */
export async function deleteMediaFile(publicId: string | null): Promise<void> {
  if (!publicId) return;
  await invoke({ action: "delete", publicId });
}
