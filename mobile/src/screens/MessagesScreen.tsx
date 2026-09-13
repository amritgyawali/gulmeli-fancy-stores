import { useState } from "react";
import { FlatList, View } from "react-native";
import { Badge, Row, SourceIcon, T, Tap } from "@/components/ui";
import { MessageArtwork } from "@/components/MessageArtwork";
import { useShop } from "@/store/ShopProvider";
import { openDestination } from "@/services/navigation";

const messages = [
  {
    id: "early",
    title: "छिट्टो गर्नुहोस्🛒🏃",
    time: "43 minutes ago",
    footer: "Be the first to save up to 35% OFF on best deals🤩",
    type: "Promos",
    kind: "early" as const,
  },
  {
    id: "hot",
    title: "ALERT: HIGH TEMPERATURE🔥",
    time: "13:30 PM",
    footer: "Enjoy up to 55% OFF on deals🛒 Shop your favorites now✅",
    type: "Promos",
    kind: "hot" as const,
  },
  {
    id: "gems",
    title: "40% OFF — shopping?🛍️",
    time: "09:10 AM",
    footer: "Free gifts & 40% OFF coupons waiting in Gems!💎🛍️",
    type: "Alerts",
    kind: "gems" as const,
  },
];
export default function MessagesScreen() {
  const { state, markRead } = useShop();
  const [category, setCategory] = useState("All");
  const [compact, setCompact] = useState(false);
  const data = (
    category === "All" ? messages : messages.filter((m) => m.type === category)
  ).filter((m) => state.commerce.notifications || m.type !== "Promos");
  return (
    <View style={{ flex: 1, backgroundColor: "#f4f4f6" }}>
      <View
        style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}
      >
        <Row style={{ gap: 12 }}>
          <T size={24} bold style={{ letterSpacing: -0.5 }}>
            Messages
          </T>
          <Tap label="Mark all as read" onPress={markRead}>
            <Row style={{ gap: 4 }}>
              <SourceIcon
                source="messages"
                index={1}
                size={16}
                color="#374151"
              />
              <T size={13} color="#374151">
                Mark all as read
              </T>
            </Row>
          </Tap>
        </Row>
      </View>
      <Row
        style={{
          justifyContent: compact ? "flex-start" : "space-around",
          gap: compact ? 16 : 0,
          paddingHorizontal: 20,
          paddingTop: compact ? 2 : 12,
          paddingBottom: 18,
          borderBottomWidth: 1,
          borderColor: "#e5e7eb80",
        }}
      >
        {["Chats", "Orders", "Alerts", "Promos"].map((label, i) => (
          <Tap
            key={label}
            label={label}
            role="tab"
            selected={category === label}
            onPress={() =>
              i < 2
                ? openDestination(label === "Chats" ? "Chats" : "Orders list")
                : setCategory((c) => (c === label ? "All" : label))
            }
            style={{ alignItems: "center", gap: 8 }}
          >
            <View
              style={{
                width: compact ? 36 : 58,
                height: compact ? 36 : 58,
                borderRadius: 99,
                backgroundColor: ["#18c29c", "#2a77f4", "#f99b1d", "#f83a74"][
                  i
                ],
                alignItems: "center",
                justifyContent: "center",
                borderWidth: category === label ? 2 : 0,
                borderColor: "#212121",
              }}
            >
              <SourceIcon
                source="messages"
                index={i + 2}
                size={compact ? 20 : 28}
                color="#fff"
              />
              {i === 2 && <Badge count={state.messagesRead ? 0 : 13} />}
              {i === 3 && !state.messagesRead && <Badge dot />}
            </View>
            {!compact && (
              <T size={12} color="#374151">
                {label}
              </T>
            )}
          </Tap>
        ))}
      </Row>
      <FlatList
        data={data}
        keyExtractor={(m) => m.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 20,
          gap: 16,
        }}
        onScroll={(e) => setCompact(e.nativeEvent.contentOffset.y > 100)}
        scrollEventThrottle={32}
        ListHeaderComponent={
          <T
            size={13}
            bold
            color="#6b7280"
            style={{ paddingHorizontal: 4, paddingTop: 16 }}
          >
            Last 7 days
          </T>
        }
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#f3f4f6",
              overflow: "hidden",
              boxShadow: "0 1px 2px #0001",
            }}
          >
            <Row
              style={{
                paddingHorizontal: 16,
                paddingTop: 14,
                paddingBottom: 10,
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 99,
                  backgroundColor:
                    item.type === "Alerts" ? "#f99b1d" : "#f83a74",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 2,
                }}
              >
                <SourceIcon
                  source="messages"
                  index={item.type === "Alerts" ? 9 : 6}
                  size={20}
                  color="#fff"
                />
                {!state.messagesRead && <Badge dot />}
              </View>
              <View style={{ flex: 1 }}>
                <T size={14.5} bold style={{ lineHeight: 20 }}>
                  {item.title}
                </T>
                <T size={12} color="#9ca3af" style={{ marginTop: 2 }}>
                  {item.time}
                </T>
              </View>
            </Row>
            <Tap
              label={item.title}
              onPress={() =>
                openDestination(
                  item.kind === "gems"
                    ? "Gems treasure chest"
                    : "Promotion details",
                )
              }
            >
              <MessageArtwork kind={item.kind} />
            </Tap>
            <T
              size={13.5}
              color="#374151"
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                lineHeight: 20,
              }}
            >
              {item.footer}
            </T>
          </View>
        )}
      />
    </View>
  );
}
