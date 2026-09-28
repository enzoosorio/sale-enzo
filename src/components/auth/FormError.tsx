/**
 * Form-level error for auth forms (server / OAuth failures), shown inline right above the
 * submit button so every error lives in the form, next to the fields it relates to.
 */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="w-full border-l-2 border-red-500 bg-red-500/5 px-3 py-2 text-red-500 text-xs md:text-sm font-inria"
    >
      {message}
    </p>
  );
}
