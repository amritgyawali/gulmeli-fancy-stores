import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Button, T } from "@/components/ui";
import { requireSupabase } from "@/services/supabase";
import { useShop } from "@/store/ShopProvider";

export default function AuthScreen() {
  const router = useRouter();
  const { live, session } = useShop();
  const [create, setCreate] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const submit = async () => {
    if (busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setNotice("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setNotice("Use a password with at least 8 characters.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const client = requireSupabase();
      const credentials = { email: email.trim(), password };
      const { data, error } = create
        ? await client.auth.signUp(credentials)
        : await client.auth.signInWithPassword(credentials);
      if (error) throw error;
      if (data.session) router.replace("/account");
      else {
        setCreate(false);
        setPassword("");
        setNotice(
          "Check your email and confirm your account, then return here to sign in.",
        );
      }
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Sign-in failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 24, gap: 18 }}
      >
        <T size={24} bold>
          {create ? "Create your account" : "Welcome back"}
        </T>
        <T>
          Sign in to save your profile and place orders with Gulmeli Fancy
          Stores.
        </T>
        {!live ? (
          <T>
            This is a local preview. Online accounts are available when the
            store is connected.
          </T>
        ) : session ? (
          <Button
            title="Go to my account"
            onPress={() => router.replace("/account")}
          />
        ) : (
          <>
            <View style={{ gap: 6 }}>
              <T bold>Email address</T>
              <TextInput
                accessibilityLabel="Email address"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                style={{
                  backgroundColor: "white",
                  borderWidth: 1,
                  borderColor: "#d1d5db",
                  borderRadius: 8,
                  padding: 14,
                }}
              />
            </View>
            <View style={{ gap: 6 }}>
              <T bold>Password</T>
              <TextInput
                accessibilityLabel="Password"
                secureTextEntry
                autoCapitalize="none"
                autoComplete={create ? "new-password" : "current-password"}
                value={password}
                onChangeText={setPassword}
                style={{
                  backgroundColor: "white",
                  borderWidth: 1,
                  borderColor: "#d1d5db",
                  borderRadius: 8,
                  padding: 14,
                }}
              />
            </View>
            <Button
              title={
                busy ? "Please wait…" : create ? "Create account" : "Sign in"
              }
              disabled={busy}
              onPress={() => void submit()}
            />
            <Button
              title={
                create
                  ? "Already have an account? Sign in"
                  : "New here? Create an account"
              }
              disabled={busy}
              outline
              onPress={() => {
                setCreate(!create);
                setNotice("");
              }}
            />
          </>
        )}
        {!!notice && (
          <T accessibilityRole="alert" color="#9a3412">
            {notice}
          </T>
        )}
        <Button
          title="Continue shopping"
          outline
          onPress={() => router.replace("/")}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
