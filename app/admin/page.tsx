export default function AdminIndexPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-slate-700">Redirecting to dashboard...</p>
      <script dangerouslySetInnerHTML={{ __html: `window.location.replace('/admin/dashboard')` }} />
    </div>
  );
}
