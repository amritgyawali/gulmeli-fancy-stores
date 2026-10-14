import { ScrollView, TextInput, View } from "@/components/store-ui";
import { useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Button, Row, T } from "@/components/ui";
import { requireSupabase } from "@/services/supabase";
import { useShop } from "@/store/ShopProvider";
import { replace } from "@/admin/navigate";
import { track } from "@/services/telemetry";
import { useSocialSignIn, type SocialProvider } from "@/services/clerk-auth";
import { credentialsSchema, type Credentials } from "@/lib/schemas";

const inputStyle = {
  backgroundColor: "white",
  borderWidth: 1,
  borderColor: "#d1d5db",
  borderRadius: 8,
  padding: 14,
};

export default function AuthScreen() {
  const router = useRouter();
  const { live, session } = useShop();
  const social = useSocialSignIn();
  const [create, setCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<Credentials>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: "", password: "" },
  });
  const email = useWatch({ control, name: "email" }) ?? "";
  const password = useWatch({ control, name: "password" }) ?? "";
  // One sign-in form for everyone: the account's role decides where it lands.
  // Staff (any admin_members row) open the dashboard, customers their account.
  const openHome = async () => {
    const { data: staff } = await requireSupabase().rpc("is_admin");
    replace(staff === true ? "/admin" : "/account");
  };
  const submit = async (values: Credentials) => {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      const client = requireSupabase();
      const credentials = {
        email: values.email.trim(),
        password: values.password,
      };
      const { data, error } = create
        ? await client.auth.signUp(credentials)
        : await client.auth.signInWithPassword(credentials);
      if (error) throw error;
      if (data.session) {
        track(create ? "account_created" : "signed_in", {
          method: "password",
        });
        await openHome();
      } else {
        setCreate(false);
        setValue("password", "");
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
  const startSocial = async (provider: SocialProvider) => {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      const done = await social.start(provider);
      if (done) {
        track("signed_in", { method: provider });
        await openHome();
      }
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Social sign-in failed.",
      );
    } finally {
      setBusy(false);
    }
  };
  const onValid = handleSubmit((values) => void submit(values));
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
          {create
            ? "Create an account to save your profile and place orders with Gulmeli Fancy Stores."
            : "Sign in to your account. Store staff go straight to the store dashboard."}
        </T>
        {!live ? (
          <T>
            This is a local preview. Online accounts are available when the
            store is connected.
          </T>
        ) : session ? (
          <Button title="Continue" onPress={() => void openHome()} />
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
                onChangeText={(value) => setValue("email", value)}
                style={inputStyle}
              />
              {!!errors.email && (
                <T accessibilityRole="alert" color="#b91c1c" size={11}>
                  {errors.email.message}
                </T>
              )}
            </View>
            <View style={{ gap: 6 }}>
              <T bold>Password</T>
              <TextInput
                accessibilityLabel="Password"
                secureTextEntry
                autoCapitalize="none"
                autoComplete={create ? "new-password" : "current-password"}
                value={password}
                onChangeText={(value) => setValue("password", value)}
                style={inputStyle}
              />
              {!!errors.password && (
                <T accessibilityRole="alert" color="#b91c1c" size={11}>
                  {errors.password.message}
                </T>
              )}
            </View>
            <Button
              title={
                busy
                  ? "Please wait…"
                  : create
                    ? "Create account"
                    : "Sign in"
              }
              disabled={busy}
              onPress={() => void onValid()}
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
        {live && social.available && !session && (
          <View style={{ gap: 8 }}>
            <T size={11} color="#6b7280">
              Or continue with
            </T>
            <Row style={{ gap: 8 }}>
              <Button
                title="Google"
                outline
                disabled={busy}
                onPress={() => void startSocial("oauth_google")}
                style={{ flex: 1 }}
              />
              {Platform.OS === "ios" && (
                <Button
                  title="Apple"
                  outline
                  disabled={busy}
                  onPress={() => void startSocial("oauth_apple")}
                  style={{ flex: 1 }}
                />
              )}
            </Row>
          </View>
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
