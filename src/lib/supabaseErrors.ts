export const formatSupabaseErrorMessage = (message: string): string => {
  const normalized = message.toLowerCase();

  if (
    normalized.includes(
      "could not find the table 'public.volunteer_opportunities'"
    )
  ) {
    return "Supabase is missing public.volunteer_opportunities. Run supabase/schema.sql (or supabase/fix-volunteer-opportunities.sql) in Supabase SQL Editor, then refresh the app.";
  }

  if (
    normalized.includes('volunteer_limit') &&
    (normalized.includes('schema cache') ||
      normalized.includes('does not exist') ||
      normalized.includes('column'))
  ) {
    return 'Supabase is missing volunteer_limit on public.volunteer_opportunities. Run supabase/fix-volunteer-opportunities.sql in Supabase SQL Editor, then refresh the app.';
  }

  return message;
};
