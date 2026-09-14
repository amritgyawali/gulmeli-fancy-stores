import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Button, T } from "@/components/ui";

// Live camera capture (expo-camera) used by visual search and review photos
// on native devices. Web uses the ordinary photo picker instead, so this
// module is never loaded there (see CameraCapture.web.tsx).

export default function CameraCapture({
  onCapture,
  onClose,
}: {
  onCapture: (uri: string) => void;
  onClose: () => void;
}) {
  const camera = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);

  if (!permission) return null;
  if (!permission.granted) {
    return (
      <View style={styles.shell}>
        <T color="#fff">The camera needs your permission.</T>
        <Button title="Allow camera" onPress={() => void requestPermission()} />
        <Button title="Close" outline color="#fff" onPress={onClose} />
      </View>
    );
  }
  return (
    <View style={styles.shell}>
      <CameraView ref={camera} style={styles.preview} facing="back" />
      <View style={styles.controls}>
        <Button
          title={busy ? "Capturing…" : "Take photo"}
          disabled={busy}
          onPress={() => {
            setBusy(true);
            void camera.current
              ?.takePictureAsync({ quality: 0.5 })
              .then((shot) => {
                if (shot?.uri) onCapture(shot.uri);
              })
              .finally(() => setBusy(false));
          }}
        />
        <Button title="Cancel" outline color="#fff" onPress={onClose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: "#000",
    padding: 12,
    gap: 12,
  },
  preview: { flex: 1, borderRadius: 8, overflow: "hidden" },
  controls: { flexDirection: "row", gap: 8 },
});
