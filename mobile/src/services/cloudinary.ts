import { backendConfig } from "./backend-config";
import { requireSupabase } from "./supabase";

export async function uploadAvatar(dataUri: string): Promise<string> {
  if (!backendConfig.cloudName)
    throw new Error("Cloudinary cloud name is not configured.");
  const { data, error } = await requireSupabase().functions.invoke(
    "upload-image",
    {
      body: { image: dataUri },
    },
  );
  if (error) {
    let message = "Photo upload failed. Please try again.";
    if (error.context instanceof Response) {
      const body = await error.context.json().catch(() => null);
      if (typeof body?.error === "string") message = body.error;
    }
    throw new Error(message);
  }
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
