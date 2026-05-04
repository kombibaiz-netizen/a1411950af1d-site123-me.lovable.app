import { supabase } from "@/integrations/supabase/client";

export async function addEarning(source: string, amount: number, metadata: Record<string, unknown> = {}) {
  const { data, error } = await supabase.rpc("add_earning", {
    p_source: source,
    p_amount: amount,
    p_metadata: metadata as never,
  });
  if (error) throw error;
  return data as number;
}

export async function requestWithdrawal(method: string, destination: string, amount: number) {
  const { data, error } = await supabase.rpc("request_withdrawal", {
    p_method: method,
    p_destination: destination,
    p_amount: amount,
  });
  if (error) throw error;
  return data as string;
}

export async function spendSats(amount: number, reason: string, metadata: Record<string, unknown> = {}) {
  const { data, error } = await supabase.rpc("spend_sats", {
    p_amount: amount,
    p_reason: reason,
    p_metadata: metadata as never,
  });
  if (error) throw error;
  return data as number;
}