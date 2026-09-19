import { View } from "react-native";
import { useRouter } from "expo-router";
import { ScrollView } from "@/components/store-ui";
import { Button, T } from "@/components/ui";
import { FontIcon } from "@/components/FontIcon";
import { useShop } from "@/store/ShopProvider";
import { useStorefrontTheme } from "@/store/StorefrontProvider";
import { useSupportTickets } from "@/services/support";
import { openDestination } from "@/services/navigation";
export default function MessagesScreen() {
  const theme = useStorefrontTheme();
  const { session, live } = useShop();
  const router = useRouter();
  const { tickets, error } = useSupportTickets(
    live ? session?.user.id : undefined,
  );
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{
        padding: theme.spacing,
        gap: 20,
        paddingBottom: 32,
      }}
    >
      <T preserveColor accessibilityRole="header" size={28} bold>
        Messages
      </T>
      <T preserveColor size={15} color={theme.muted}>
        Your conversations with our store team.
      </T>
      {error && (
        <T preserveColor accessibilityRole="alert">
          {error}
        </T>
      )}
      {!tickets.length && (
        <View
          style={{
            backgroundColor: theme.surface,
            borderRadius: theme.cardRadius,
            padding: 28,
            gap: 16,
            alignItems: "center",
          }}
        >
          <FontIcon name="comments" size={38} color={theme.primaryText} />
          <T preserveColor bold size={20}>
            We are here to help
          </T>
          <T preserveColor color={theme.muted} style={{ textAlign: "center" }}>
            Ask about a product or an order. Your conversations and replies
            appear here.
          </T>
        </View>
      )}
      {tickets.map((ticket) => (
        <View
          key={ticket.id}
          style={{
            backgroundColor: theme.surface,
            borderRadius: theme.cardRadius,
            padding: 18,
            gap: 14,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <T preserveColor size={18} bold>
            {ticket.subject}
          </T>
          <T preserveColor color={theme.muted}>
            {ticket.status}
          </T>
          {ticket.messages.map((message, i) => (
            <View
              key={i}
              style={{
                padding: 14,
                gap: 5,
                backgroundColor: theme.background,
                borderRadius: theme.inputRadius,
              }}
            >
              <T preserveColor bold>
                {message.author === "customer" ? "You" : "Store team"}
              </T>
              <T preserveColor size={14}>
                {message.body}
              </T>
              <T preserveColor size={11} color={theme.muted}>
                {new Date(message.at).toLocaleString()}
              </T>
            </View>
          ))}
          <Button
            title="Contact store"
            outline
            onPress={() =>
              openDestination("Contact Customer Care", { ticketId: ticket.id })
            }
          />
        </View>
      ))}
      <Button
        title={
          live && !session ? "Login to contact us" : "Start a conversation"
        }
        onPress={() =>
          live && !session
            ? router.push("/auth")
            : openDestination("Contact Customer Care")
        }
      />
    </ScrollView>
  );
}
