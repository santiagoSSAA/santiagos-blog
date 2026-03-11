import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { NewsletterRepository } from "./newsletter-repository";

export function createNewsletterRepository(): NewsletterRepository {
  const supabase = createServerSupabaseClient();

  return {
    async subscribe(email) {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({ email });

      if (error) {
        if (error.code === "23505") {
          return { alreadyExists: true };
        }
        throw error;
      }

      return { alreadyExists: false };
    },
  };
}
