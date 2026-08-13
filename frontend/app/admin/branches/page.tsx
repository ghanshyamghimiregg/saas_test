"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { Branch, BranchProvisionOut } from "@/lib/types";
import { Table } from "@/components/ui/Table";
import { PageSpinner, Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";
import { Toast, useToast } from "@/components/ui/Toast";

export default function BranchesPage() {
  const { toast, show, dismiss } = useToast();
  const [branches,     setBranches]     = useState<Branch[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [createModal,  setCreateModal]  = useState(false);
  const [provisioned,  setProvisioned]  = useState<BranchProvisionOut | null>(null);
  const [resetResult,  setResetResult]  = useState<{ branch_code: string; new_password: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<Branch[]>("/branches/?include_inactive=true");
      setBranches(data);
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : "Failed to load", "error");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line

  async function createBranch(name: string, address: string) {
    try {
      const data = await api.post<BranchProvisionOut>("/branches/", { name, address: address || null });
      setProvisioned(data);
      load();
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : "Failed to create", "error");
    }
  }

  async function toggleActive(branch: Branch) {
    try {
      await api.patch(`/branches/${branch.id}`, { is_active: !branch.is_active });
      show(`Branch ${branch.is_active ? "deactivated" : "activated"}`, "success");
      load();
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : "Failed", "error");
    }
  }

  async function resetPassword(branch: Branch) {
    if (!confirm(`Reset password for "${branch.name}"? This cannot be undone.`)) return;
    try {
      const data = await api.post<{ branch_code: string; new_password: string }>(
        `/branches/${branch.id}/reset-password`,
      );
      setResetResult(data);
    } catch (e: unknown) {
      show(e instanceof Error ? e.message : "Reset failed", "error");
    }
  }

  const columns = [
    {
      key:    "name",
      header: "Branch",
      render: (b: Branch) => (
        <div>
          <div className="font-medium text-ink">{b.name}</div>
          {b.address && <div className="text-xs text-ink-faint mt-0.5">{b.address}</div>}
        </div>
      ),
    },
    {
      key:    "code",
      header: "Code",
      mono:   true as const,
      render: (b: Branch) => <span className="badge-blue font-mono tracking-wide">{b.code}</span>,
    },
    {
      key:    "is_active",
      header: "Status",
      render: (b: Branch) =>
        b.is_active
          ? <span className="badge-green">Active</span>
          : <span className="badge-gray">Inactive</span>,
    },
    {
      key:    "actions",
      header: "",
      render: (b: Branch) => (
        <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            className="btn-secondary btn-sm"
            onClick={() => resetPassword(b)}
            aria-label={`Reset password for ${b.name}`}
          >
            Reset password
          </button>
          <button
            className={b.is_active ? "btn-danger btn-sm" : "btn-secondary btn-sm"}
            onClick={() => toggleActive(b)}
            aria-label={b.is_active ? `Deactivate ${b.name}` : `Activate ${b.name}`}
          >
            {b.is_active ? "Deactivate" : "Activate"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1>Branches</h1>
        <button
          className="btn-primary btn-sm flex items-center gap-1.5"
          onClick={() => setCreateModal(true)}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          New branch
        </button>
      </div>

      {loading ? (
        <PageSpinner label="Loading branches…" />
      ) : (
        <Table
          columns={columns as unknown as Parameters<typeof Table>[0]["columns"]}
          rows={branches as unknown as Record<string, unknown>[]}
          keyField={"id" as never}
          emptyMessage="No branches yet."
          emptyDetail="Create your first branch to get started."
        />
      )}

      {/* Create branch modal */}
      <Modal
        open={createModal}
        onClose={() => setCreateModal(false)}
        title="New branch"
        size="sm"
      >
        <CreateBranchForm
          onSubmit={async (name, address) => {
            setCreateModal(false);
            await createBranch(name, address);
          }}
        />
      </Modal>

      {/* One-time credentials modal */}
      <Modal
        open={!!provisioned}
        onClose={() => setProvisioned(null)}
        title="Branch created — save credentials"
        size="sm"
        persistent
      >
        {provisioned && (
          <div className="space-y-4">
            <div className="alert-warning text-xs">
              This password is shown <strong>once</strong> and not stored in plaintext. Copy it before closing.
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4 py-1.5 border-b border-border">
                <dt className="text-ink-muted text-xs">Branch name</dt>
                <dd className="font-medium text-ink">{provisioned.name}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-1.5 border-b border-border">
                <dt className="text-ink-muted text-xs">Branch code</dt>
                <dd className="font-mono font-bold text-ink tracking-wide">{provisioned.code}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-1.5">
                <dt className="text-ink-muted text-xs">Password</dt>
                <dd>
                  <code className="font-mono font-bold text-ink bg-canvas border border-border rounded px-2 py-1 text-sm select-all">
                    {provisioned.plaintext_password}
                  </code>
                </dd>
              </div>
            </dl>
            <p className="text-xs text-ink-faint">
              Branch staff use the code + password to sign in to the stock and sales terminals.
            </p>
            <button className="btn-primary w-full" onClick={() => setProvisioned(null)}>
              I&apos;ve saved the credentials
            </button>
          </div>
        )}
      </Modal>

      {/* Password reset modal */}
      <Modal
        open={!!resetResult}
        onClose={() => setResetResult(null)}
        title="Password reset — save new credentials"
        size="sm"
        persistent
      >
        {resetResult && (
          <div className="space-y-4">
            <div className="alert-warning text-xs">New password shown once only.</div>
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4 py-1.5 border-b border-border">
                <dt className="text-ink-muted text-xs">Branch code</dt>
                <dd className="font-mono font-bold text-ink tracking-wide">{resetResult.branch_code}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-1.5">
                <dt className="text-ink-muted text-xs">New password</dt>
                <dd>
                  <code className="font-mono font-bold text-ink bg-canvas border border-border rounded px-2 py-1 text-sm select-all">
                    {resetResult.new_password}
                  </code>
                </dd>
              </div>
            </dl>
            <button className="btn-primary w-full" onClick={() => setResetResult(null)}>Done</button>
          </div>
        )}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismiss} />}
    </>
  );
}

function CreateBranchForm({ onSubmit }: { onSubmit: (name: string, address: string) => void }) {
  const [name,    setName]    = useState("");
  const [address, setAddress] = useState("");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(name, address); }}
      className="space-y-4"
      noValidate
    >
      <div>
        <label htmlFor="br-name" className="label label-required">Branch name</label>
        <input
          id="br-name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          aria-required="true"
        />
      </div>
      <div>
        <label htmlFor="br-addr" className="label">Address</label>
        <input
          id="br-addr"
          className="input"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>
      <button
        type="submit"
        className="btn-primary w-full"
        disabled={!name.trim()}
        aria-disabled={!name.trim()}
      >
        Create branch
      </button>
    </form>
  );
}
