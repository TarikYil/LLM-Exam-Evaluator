export default function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return <div className="panel error">{message}</div>;
}
