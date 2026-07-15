export default function Template({ children }: { children: React.ReactNode }) {
  // Re-mounts on every navigation, so the page content fades in smoothly.
  return <div className="animate-page-in">{children}</div>;
}
