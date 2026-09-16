import { useEffect, useState } from "react";
import { RefreshControl, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ScrollView } from "@/components/store-ui";
import { Button, Row, T, Tap } from "@/components/ui";
import { FontIcon } from "@/components/FontIcon";
import { useShop } from "@/store/ShopProvider";
import { useStorefront, useStorefrontTheme } from "@/store/StorefrontProvider";
import { openDestination } from "@/services/navigation";
import { supabase } from "@/services/supabase";

export default function AccountScreen() {
  const { state, session, live, refreshAccount } = useShop();
  const theme = useStorefrontTheme();
  const { feature } = useStorefront();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [staffOwner, setStaffOwner] = useState<string>();
  useEffect(() => {
    let active = true;
    if (session?.user.id && supabase)
      void supabase
        .from("admin_members")
        .select("user_id")
        .eq("user_id", session.user.id)

        .maybeSingle()
        .then(({ data }) => {
          if (active) setStaffOwner(data?.user_id);
        });
    return () => {
      active = false;
    };
  }, [session?.user.id]);
  const refresh = async () => {
    setRefreshing(true);
    setError("");
    try {
      await refreshAccount();
    } catch {
      setError("Could not refresh your account. Pull down to try again.");
    } finally {
      setRefreshing(false);
    }
  };
  const profile = state.commerce.profile;
  const links = [
    {
      title: "My orders",
      description: "Track deliveries and view order history",
      icon: "box",
    },
    ...(feature("wishlist")
      ? [
          {
            title: "Wishlist",
            description: "All your saved favourites",
            icon: "heart",
          },
        ]
      : []),
    {
      title: "Edit profile",
      description: "Your name, address and contact details",
      icon: "user",
    },
    ...(feature("reviews")
      ? [
          {
            title: "My Reviews",
            description: "Your product feedback",
            icon: "star",
          },
        ]
      : []),
    {
      title: "Contact Customer Care",
      description: "Get help from our store team",
      icon: "headset",
    },
    {
      title: "Settings",
      description: "Account preferences and sign out",
      icon: "gear",
    },
  ];
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{
        padding: theme.spacing,
        gap: 24,
        paddingBottom: 32,
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void refresh()}
          tintColor={theme.primary}
        />
      }
    >
      <T preserveColor accessibilityRole="header" size={28} bold>
        Account
      </T>
      <View
        style={{
          backgroundColor: theme.surface,
          padding: 20,
          gap: 18,
          borderRadius: theme.cardRadius,
          borderWidth: 1,
          borderColor: theme.border,
        }}
      >
        <Row style={{ gap: 16 }}>
          {profile.avatar ? (
            <Image
              source={{ uri: profile.avatar }}
              style={{ width: 64, height: 64, borderRadius: 32 }}
              accessibilityLabel="Your profile photo"
            />
          ) : (
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: theme.primary,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FontIcon name="user" size={26} color={theme.onPrimary} />
            </View>
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <T preserveColor size={22} bold>
              {profile.name ||
                (session ? "Welcome back" : "Make yourself at home")}
            </T>
            <T preserveColor color={theme.muted}>
              {session?.user.email ||
                "Your favourites, orders and everyday finds."}
            </T>
          </View>
        </Row>
        {live && !session ? (
          <Button title="Login" onPress={() => router.push("/auth")} />
        ) : (
          <Row style={{ gap: 12 }}>
            {[
              {
                label: "Orders",
                value: state.commerce.orders.length,
                target: "My orders",
              },
              {
                label: "Saved",
                value: state.commerce.wishlist.length,
                target: "Wishlist",
              },
              {
                label: "Reviews",
                value: state.commerce.reviews.length,
                target: "My Reviews",
              },
            ].map((item) => (
              <Tap
                key={item.label}
                label={item.target}
                onPress={() => openDestination(item.target)}
                style={{
                  flex: 1,
                  padding: 12,
                  minHeight: 72,
                  backgroundColor: theme.background,
                  borderRadius: theme.inputRadius,
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <T preserveColor bold size={22}>
                  {item.value}
                </T>
                <T preserveColor color={theme.muted}>
                  {item.label}
                </T>
              </Tap>
            ))}
          </Row>
        )}
      </View>
      {!!error && (
        <T preserveColor accessibilityRole="alert" color={theme.text}>
          {error}
        </T>
      )}
      <View
        style={{
          backgroundColor: theme.surface,
          borderRadius: theme.cardRadius,
          borderWidth: 1,
          borderColor: theme.border,
          overflow: "hidden",
        }}
      >
        {links.map((item, i) => (
          <Tap
            key={item.title}
            label={item.title}
            onPress={() => openDestination(item.title)}
            style={{
              minHeight: 80,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
              borderTopWidth: i ? 1 : 0,
              borderColor: theme.border,
            }}
          >
            <FontIcon name={item.icon} size={20} color={theme.primaryText} />
            <View style={{ flex: 1, gap: 3 }}>
              <T preserveColor bold size={15}>
                {item.title}
              </T>
              <T preserveColor color={theme.muted}>
                {item.description}
              </T>
            </View>
            <FontIcon name="chevron-right" size={13} color={theme.muted} />
          </Tap>
        ))}
      </View>
      {(!live || (session && staffOwner === session.user.id)) && (
        <Button
          title="Admin dashboard"
          outline
          onPress={() => router.push("/admin")}
        />
      )}
    </ScrollView>
  );
}
