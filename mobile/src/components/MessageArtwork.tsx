import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Row, SourceIcon, T } from "./ui";
import { shared } from "@/theme/tokens";

// Native equivalents of the CSS campaign illustrations in daraz_app_messages_screen/code.html.
export function MessageArtwork({ kind }: { kind: "early" | "hot" | "gems" }) {
  const early = kind === "early";
  const hot = kind === "hot";
  return (
    <LinearGradient
      colors={
        early
          ? ["#e8edff", "#f4e8fd", "#6a57e3", "#4622b3"]
          : hot
            ? ["#ff4c00", "#ff7700", "#ffa100", "#ffe600"]
            : ["#590069", "#87018d", "#a5027c", "#d2177c"]
      }
      locations={
        early ? [0, 0.45, 0.85, 1] : hot ? [0, 0.5, 0.85, 1] : [0, 0.35, 0.7, 1]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        height: 176,
        marginHorizontal: 12,
        borderRadius: 12,
        overflow: "hidden",
        padding: 14,
        borderWidth: early ? 1 : 0,
        borderColor: "#e0e7ff80",
      }}
    >
      <Row
        style={{
          justifyContent: "space-between",
          alignItems: "flex-start",
          zIndex: 2,
        }}
      >
        <View style={{ flex: 1 }}>
          <T
            size={13}
            bold
            color={early || hot ? "#f85606" : "#87018d"}
            style={{
              backgroundColor: early ? "#ffeed9" : "#fff",
              alignSelf: "flex-start",
              borderRadius: 4,
              paddingHorizontal: 8,
              paddingVertical: 2,
              letterSpacing: 0.5,
            }}
          >
            9.9 SALE
          </T>
          {early ? (
            <T
              size={20}
              bold
              color="#1a1261"
              style={{ lineHeight: 21, marginTop: 4, letterSpacing: -0.5 }}
            >
              EARLY BIRD{"\n"}DEALS 👾
            </T>
          ) : hot ? (
            <>
              <T
                size={24}
                bold
                color="#fff"
                style={{ fontStyle: "italic", lineHeight: 28, marginTop: 4 }}
              >
                HOT DEALS
              </T>
              <T size={11} color="#fff" style={{ marginTop: 2 }}>
                Deals that wow hearts
              </T>
            </>
          ) : (
            <>
              <T size={10} bold color="#eaff00" style={{ marginTop: 4 }}>
                PLAY GEMS TREASURE CHEST &amp;
              </T>
              <T size={20} bold color="#eaff00" style={{ lineHeight: 20 }}>
                WIN FREE GIFTS
              </T>
              <T size={20} bold color="#fff" style={{ lineHeight: 20 }}>
                DAILY
              </T>
            </>
          )}
        </View>
        {early && (
          <Discount amount="35%" color="#7953f4" textColor="#fff" dashed />
        )}
      </Row>
      {early ? (
        <>
          <View
            style={{
              position: "absolute",
              bottom: -24,
              right: 0,
              width: 256,
              height: 64,
              backgroundColor: "#b5efdf",
              borderTopLeftRadius: 99,
            }}
          />
          <Row
            style={{
              position: "absolute",
              bottom: -3,
              right: 14,
              alignItems: "flex-end",
              gap: 8,
            }}
          >
            <View
              style={[
                shared.center,
                {
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  backgroundColor: "#111827cc",
                  borderWidth: 1,
                  borderColor: "#ffffff66",
                },
              ]}
            >
              <SourceIcon
                source="messages"
                index={7}
                size={30}
                color="#ef4444"
              />
            </View>
            <View
              style={[
                shared.center,
                {
                  width: 44,
                  height: 56,
                  borderRadius: 6,
                  backgroundColor: "#92400ee6",
                  borderWidth: 2,
                  borderColor: "#451a03",
                },
              ]}
            >
              <T
                size={6}
                bold
                color="#fff"
                style={{ backgroundColor: "#000", paddingHorizontal: 4 }}
              >
                ACHAR
              </T>
              <T size={7} bold color="#fde68a" style={{ marginTop: 4 }}>
                CHICKEN
              </T>
            </View>
            <View
              style={{
                width: 64,
                height: 96,
                backgroundColor: "#1f262d",
                borderRadius: 12,
                paddingVertical: 6,
                alignItems: "center",
                justifyContent: "space-between",
                borderWidth: 1,
                borderColor: "#374151",
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 8,
                  backgroundColor: "#4b5563",
                  borderRadius: 99,
                }}
              />
              <View
                style={[
                  shared.center,
                  {
                    width: 40,
                    height: 40,
                    borderWidth: 1,
                    borderColor: "#6b728066",
                    borderRadius: 4,
                  },
                ]}
              >
                <T size={7} bold color="#9ca3af">
                  EVEREST
                </T>
              </View>
              <View
                style={{
                  width: 48,
                  height: 12,
                  backgroundColor: "#1f2937",
                  borderRadius: 4,
                }}
              />
            </View>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 8,
                padding: 4,
                backgroundColor: "#fff",
                justifyContent: "space-between",
              }}
            >
              <View style={{ height: 12, backgroundColor: "#fbbf24" }} />
              <Row style={{ justifyContent: "center", gap: 4 }}>
                <View
                  style={{ width: 16, height: 16, backgroundColor: "#fef9c3" }}
                />
                <View
                  style={{ width: 16, height: 16, backgroundColor: "#fef08a" }}
                />
              </Row>
              <View
                style={{
                  height: 8,
                  backgroundColor: "#f3f4f6",
                  borderRadius: 99,
                }}
              />
            </View>
          </Row>
        </>
      ) : hot ? (
        <>
          <View style={{ position: "absolute", bottom: 20, left: 14 }}>
            <Discount amount="55%" color="#ffe600" textColor="#171717" dashed />
          </View>
          <Row
            style={{
              position: "absolute",
              bottom: 10,
              right: 12,
              gap: 7,
              alignItems: "flex-end",
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 99,
                backgroundColor: "#171717",
                borderWidth: 1,
                borderColor: "#44403c",
                overflow: "hidden",
                justifyContent: "flex-end",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 50,
                  height: 24,
                  backgroundColor: "#44403c",
                  borderTopLeftRadius: 99,
                  borderTopRightRadius: 99,
                  borderWidth: 1,
                  borderColor: "#78716c",
                }}
              />
              <T size={6} color="#fff">
                DOT
              </T>
            </View>
            <View
              style={[
                shared.center,
                {
                  width: 40,
                  height: 56,
                  borderRadius: 8,
                  backgroundColor: "#111827",
                  borderWidth: 1,
                  borderColor: "#4b5563",
                },
              ]}
            >
              <View
                style={[
                  shared.center,
                  {
                    width: 28,
                    height: 28,
                    borderRadius: 99,
                    borderWidth: 2,
                    borderColor: "#a16207",
                    backgroundColor: "#000",
                  },
                ]}
              >
                <T size={14} color="#fff">
                  L
                </T>
              </View>
            </View>
            <View
              style={{
                width: 96,
                height: 64,
                borderRadius: 8,
                backgroundColor: "#09090b",
                borderWidth: 1,
                borderColor: "#52525b",
                alignItems: "center",
                padding: 8,
              }}
            >
              <View
                style={[
                  shared.center,
                  {
                    width: 48,
                    height: 38,
                    borderWidth: 2,
                    borderStyle: "dashed",
                    borderRadius: 99,
                    borderColor: "#3f3f46",
                  },
                ]}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 99,
                    borderWidth: 1,
                    borderColor: "#f59e0b",
                  }}
                />
              </View>
              <T size={5} color="#a1a1aa" style={{ alignSelf: "flex-end" }}>
                TOUCH
              </T>
            </View>
          </Row>
          <T
            size={5}
            color="#fff"
            style={{ position: "absolute", bottom: 2, right: 3 }}
          >
            *T&amp;Cs Apply
          </T>
        </>
      ) : (
        <>
          <View style={{ position: "absolute", bottom: 10, left: 14 }}>
            <Discount amount="40%" color="#eaff00" textColor="#590069" extra />
          </View>
          <View
            style={{
              position: "absolute",
              bottom: 10,
              right: 8,
              width: 128,
              height: 80,
              borderWidth: 4,
              borderColor: "#854d0e",
              borderBottomLeftRadius: 12,
              borderBottomRightRadius: 12,
              backgroundColor: "#b45309",
            }}
          >
            <Row
              style={{
                position: "absolute",
                top: -14,
                left: 8,
                right: 8,
                gap: 8,
                alignItems: "flex-end",
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 48,
                  backgroundColor: "#dc2626",
                  borderWidth: 1,
                  borderColor: "#fff",
                  borderTopLeftRadius: 5,
                  borderTopRightRadius: 5,
                }}
              >
                <T
                  size={5}
                  color="#fff"
                  bold
                  style={{ textAlign: "center", paddingTop: 4 }}
                >
                  MAK
                </T>
              </View>
              <View
                style={{
                  width: 28,
                  height: 40,
                  backgroundColor: "#059669",
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: "#fde047",
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    width: 16,
                    height: 20,
                    backgroundColor: "#facc15",
                    marginTop: 4,
                  }}
                />
              </View>
              <View
                style={[
                  shared.center,
                  {
                    width: 32,
                    height: 56,
                    backgroundColor: "#fde68a",
                    borderWidth: 1,
                    borderColor: "#fbbf24",
                    borderRadius: 5,
                  },
                ]}
              >
                <T
                  size={5}
                  bold
                  color="#166534"
                  style={{ textAlign: "center" }}
                >
                  LEMON{"\n"}TREE
                </T>
              </View>
            </Row>
          </View>
        </>
      )}
    </LinearGradient>
  );
}
function Discount({
  amount,
  color,
  textColor,
  dashed = false,
  extra = false,
}: {
  amount: string;
  color: string;
  textColor: string;
  dashed?: boolean;
  extra?: boolean;
}) {
  return (
    <View
      style={[
        shared.center,
        {
          width: 56,
          height: 56,
          borderRadius: 99,
          backgroundColor: color,
          borderWidth: dashed ? 2 : 0,
          borderStyle: dashed ? "dashed" : "solid",
          borderColor: "#ffffffb3",
        },
      ]}
    >
      <T size={8} bold color={textColor} style={{ lineHeight: 9 }}>
        {extra ? "EXTRA" : "UP TO"}
      </T>
      <T size={15} bold color={textColor} style={{ lineHeight: 18 }}>
        {amount}
      </T>
      <T size={8} bold color={textColor} style={{ lineHeight: 9 }}>
        OFF
      </T>
    </View>
  );
}
