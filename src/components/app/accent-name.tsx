/**
 * A name with its last word set in the serif italic accent ("Goa *trip*"),
 * the v1 headline treatment. Single words stay in the UI face.
 */
export function AccentName({ name }: Readonly<{ name: string }>) {
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return <>{name}</>;
  const last = words.pop();
  return (
    <>
      {words.join(" ")} <span className="font-accent tracking-[-0.01em]">{last}</span>
    </>
  );
}
