export default function HashMythAdminPage() {
  return (
    <main style={{ minHeight: "100vh", padding: "96px 24px", color: "#e9efff", background: "#0a0a1a" }}>
      <h1>HashMyth Admin</h1>
      <p style={{ color: "rgba(233,239,255,0.7)" }}>
        Shared admin dashboard for HashMyth video engine management.
        {/* Admin dashboard UI mounts from packages/admin when available */}
      </p>
      <div style={{
        marginTop: "2rem",
        padding: "1.5rem",
        borderRadius: 12,
        border: "1px solid rgba(167,139,250,.24)",
        background: "rgba(10,10,26,.72)"
      }}>
        <h3 style={{ margin: "0 0 0.5rem", color: "#a78bfa" }}>Admin Sections</h3>
        <ul style={{ color: "rgba(233,239,255,0.7)", lineHeight: 2 }}>
          <li>Video Job Management</li>
          <li>Feed Moderation</li>
          <li>Platform Payment Receipts</li>
          <li>Display Artifact Approval</li>
          <li>Product Settings</li>
          <li>Runtime Status</li>
        </ul>
      </div>
    </main>
  );
}
