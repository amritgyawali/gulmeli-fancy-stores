export default function CameraCapture(): null {
  // Web renders the browser file/camera picker through expo-image-picker
  // instead; the native CameraView never enters the web bundle.
  return null;
}
