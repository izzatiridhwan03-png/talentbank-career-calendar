export default function AdminIndexPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-cream">
      <p className="text-sm text-brand-brown">Redirecting to dashboard...</p>
      <script dangerouslySetInnerHTML={{ __html: `window.location.replace('/admin/dashboard')` }} />
    </div>
  );
}
