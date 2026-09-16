import { useEffect, useState } from "react";
import { randomUUID } from "expo-crypto";
import { requireSupabase } from "./supabase";
export interface SupportTicket {
  id: string;
  subject: string;
  status: string;
  messages: { author: string; body: string; at: string }[];
}
export async function sendSupportMessage(
  message: string,
  subject = "Customer care",
  id = randomUUID(),
) {
  const { data, error } = await requireSupabase().rpc("send_support_message", {
    p_id: id,
    p_message: message,
    p_subject: subject,
  });
  if (error) throw new Error(error.message);
  return data as string;
}
export function useSupportTickets(userId?: string) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [error, setError] = useState("");
  const [owner, setOwner] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    const refresh = () => {
      void requireSupabase()
        .rpc("my_support_tickets")
        .then(({ data, error }) => {
          if (!active) return;
          setOwner(userId);
          setError(error?.message ?? "");
          if (!error && Array.isArray(data)) setTickets(data);
        });
    };
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [userId]);
  return {
    tickets: owner === userId ? tickets : [],
    error: owner === userId ? error : "",
  };
}
