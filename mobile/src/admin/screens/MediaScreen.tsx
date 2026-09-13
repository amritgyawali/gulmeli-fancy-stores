import { useMemo, useState } from "react";
import { Image, Pressable, View } from "react-native";
import { AdminShell, Panel } from "@/admin/ui/Shell";
import {
  A,
  Btn,
  Col,
  EmptyState,
  Icon,
  IconBtn,
  Pill,
  Row,
  Tabs,
} from "@/admin/ui/primitives";
import { TextBox } from "@/admin/ui/inputs";
import { useImagePicker } from "@/admin/ui/FieldRenderer";
import { useAdmin } from "@/admin/AdminProvider";
import { useLayout } from "@/admin/ui/theme";
import { useFormat } from "@/admin/ui/useFormat";
import { go } from "@/admin/navigate";

export function MediaScreen() {
  const { theme, store, write, allowed, notify, revision } = useAdmin();
  const layout = useLayout();
  const format = useFormat();
  const pickImage = useImagePicker();
  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [url, setUrl] = useState("");

  const canEdit = allowed("media", "edit");

  const files = useMemo(
    () => store.all("media"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, revision],
  );

  const folders = useMemo(
    () => [
      "all",
      ...new Set(files.map((file) => String(file.folder || "General"))),
    ],
    [files],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return files
      .filter(
        (file) =>
          folder === "all" || String(file.folder || "General") === folder,
      )
      .filter((file) =>
        needle
          ? [
              file.name,
              file.alt,
              file.folder,
              ...(Array.isArray(file.tags) ? file.tags : []),
            ]
              .join(" ")
              .toLowerCase()
              .includes(needle)
          : true,
      )
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }, [files, folder, search]);

  const record = selected ? store.get("media", selected) : null;
  const columns = layout.wide ? 6 : layout.compact ? 3 : 4;

  return (
    <AdminShell
      title="Media library"
      subtitle="Images, video, PDFs and documents reused across the storefront"
      actions={
        canEdit ? (
          <Row gap={6}>
            <Btn
              title="Upload from this device"
              icon="camera"
              tone="primary"
              small
              theme={theme}
              onPress={() => void pickImage()}
            />
            <Btn
              title="All fields"
              icon="table"
              small
              theme={theme}
              onPress={() => go("/admin/r/media")}
            />
          </Row>
        ) : undefined
      }
    >
      <Row gap={8} wrap>
        <View style={{ flex: 1, minWidth: 200 }}>
          <TextBox
            value={search}
            onChange={setSearch}
            placeholder="Search by name, alt text or tag"
            theme={theme}
            label="Search media"
          />
        </View>
        {canEdit && (
          <>
            <View style={{ flex: 1, minWidth: 200 }}>
              <TextBox
                value={url}
                onChange={setUrl}
                placeholder="Add by URL"
                theme={theme}
                label="Media URL"
              />
            </View>
            <Btn
              title="Add"
              icon="plus"
              small
              theme={theme}
              onPress={() => {
                if (!url.trim()) return;
                store.create(
                  "media",
                  {
                    name: url.split("/").pop() ?? "File",
                    folder: folder === "all" ? "General" : folder,
                    kind: /\.(mp4|mov|webm)$/i.test(url)
                      ? "video"
                      : /\.pdf$/i.test(url)
                        ? "pdf"
                        : "image",
                    url: url.trim(),
                    alt: "",
                    tags: [],
                    width: 0,
                    height: 0,
                    sizeKb: 0,
                    note: "",
                  },
                  write,
                );
                setUrl("");
                notify("Added to the media library.", "success");
              }}
            />
          </>
        )}
      </Row>

      <Tabs
        tabs={folders.map((entry) => ({
          key: entry,
          label: entry === "all" ? `All (${files.length})` : entry,
        }))}
        active={folder}
        onChange={setFolder}
        theme={theme}
      />

      {filtered.length ? (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            marginHorizontal: -5,
          }}
        >
          {filtered.map((file) => (
            <View
              key={file.id}
              style={{ width: `${100 / columns}%` as never, padding: 5 }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={String(file.name)}
                aria-selected={selected === file.id}
                onPress={() =>
                  setSelected(selected === file.id ? null : file.id)
                }
                style={({ pressed }) => ({
                  borderRadius: theme.radius,
                  borderWidth: 2,
                  borderColor:
                    selected === file.id ? theme.primary : theme.border,
                  overflow: "hidden",
                  backgroundColor: theme.surface,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <View
                  style={{ aspectRatio: 1, backgroundColor: theme.background }}
                >
                  {file.kind === "image" ? (
                    <Image
                      source={{ uri: String(file.url) }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon
                        name={
                          file.kind === "video"
                            ? "film"
                            : file.kind === "pdf"
                              ? "file-pdf"
                              : "file"
                        }
                        size={20}
                        color={theme.muted}
                      />
                    </View>
                  )}
                </View>
                <View style={{ padding: 6 }}>
                  <A size={11} numberOfLines={1}>
                    {String(file.name)}
                  </A>
                </View>
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <EmptyState
          icon="photo-film"
          title="No files yet"
          detail="Upload a photo from this device or add one by URL, then reuse it anywhere."
          theme={theme}
        />
      )}

      {!!record && (
        <Panel
          title={String(record.name)}
          subtitle={`${record.kind} · ${record.sizeKb ? `${record.sizeKb} KB · ` : ""}added ${format.date(record.createdAt)}`}
          actions={
            canEdit ? (
              <Row gap={6}>
                <IconBtn
                  icon="trash-can"
                  label="Delete this file"
                  tone="danger"
                  theme={theme}
                  onPress={() => {
                    store.remove("media", record.id, write);
                    setSelected(null);
                    notify("File moved to trash.");
                  }}
                />
              </Row>
            ) : undefined
          }
        >
          <Col gap={10}>
            <TextBox
              value={String(record.name ?? "")}
              onChange={(value) =>
                store.update("media", record.id, { name: value }, write)
              }
              theme={theme}
              label="File name"
              disabled={!canEdit}
            />
            <TextBox
              value={String(record.alt ?? "")}
              onChange={(value) =>
                store.update("media", record.id, { alt: value }, write)
              }
              placeholder="Describes the image for screen readers and SEO"
              theme={theme}
              label="Alt text"
              disabled={!canEdit}
            />
            <TextBox
              value={String(record.folder ?? "")}
              onChange={(value) =>
                store.update("media", record.id, { folder: value }, write)
              }
              theme={theme}
              label="Folder"
              disabled={!canEdit}
            />
            <TextBox
              value={String(record.url ?? "")}
              onChange={(value) =>
                store.update("media", record.id, { url: value }, write)
              }
              theme={theme}
              label="URL"
              disabled={!canEdit}
            />
            <Row gap={8} wrap>
              <Pill
                label={`${record.width || "?"} × ${record.height || "?"}`}
                theme={theme}
                small
              />
              <Pill
                label={String(record.kind)}
                theme={theme}
                small
                color={theme.info}
              />
            </Row>
          </Col>
        </Panel>
      )}
    </AdminShell>
  );
}
