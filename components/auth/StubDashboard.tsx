import { useSession, signOut } from "next-auth/react";
import { ROLE_LABELS } from "@/lib/roles";
import DashboardLayout from "@/components/layout/DashboardLayout";

type Props = { expectedRole: string };

export default function StubDashboard({ expectedRole }: Props) {
  const { data: session } = useSession();
  if (!session?.user) return null;
  const role = session.user.role;

  const header = (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col">
        <h1 className="text-section text-text-primary">
          Good morning, {session.user.name?.split(" ")[0] ?? "there"}
        </h1>
        <p className="text-meta text-text-secondary">
          {expectedRole} Dashboard · Phase A/B stub
        </p>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="bg-bg-elevated border border-border-default text-text-primary text-body px-4 py-2 rounded-button hover:border-text-secondary transition-colors"
      >
        Sign out
      </button>
    </div>
  );

  return (
    <DashboardLayout title={expectedRole} header={header}>
      <div className="max-w-[640px] flex flex-col gap-6">
        <div className="bg-bg-surface border border-border-subtle rounded-card p-8 flex flex-col gap-4">
          <p className="text-meta text-text-secondary tracking-section uppercase">
            Session payload
          </p>
          <div className="flex flex-col gap-2 text-body">
            <p>
              <span className="text-text-secondary">Name:</span>{" "}
              <span className="text-text-primary">{session.user.name}</span>
            </p>
            <p>
              <span className="text-text-secondary">Email:</span>{" "}
              <span className="text-text-primary">{session.user.email}</span>
            </p>
            <p>
              <span className="text-text-secondary">Role from JWT:</span>{" "}
              <span className="text-accent-primary font-medium">{ROLE_LABELS[role]}</span>
            </p>
          </div>
        </div>
        <p className="text-meta text-text-disabled">
          The sidebar on your left is the role contract. Hover it to expand. Each role
          sees a different set of nav items — that&apos;s the &quot;interface physically
          changes by role&quot; promise. Real screens land in Phase C.
        </p>
      </div>
    </DashboardLayout>
  );
}
