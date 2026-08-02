"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { Branch, BranchProvisionOut } from "@/lib/types";
import { Table } from "@/components/ui/Table";
import { Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";
import { Toast, useToast } from "@/components/ui/Toast";

export default function BranchesPage() {
  const { toast, show, dismiss } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [provisioned, setProvisioned] = useState<BranchProvisionOut | null>(null);
  const [resetResult, setResetResult] = useState<{ branch_code: string; new_password: string } | null>(null);

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
    if (!confirm(`Reset password for ${branch.name}?`)) return;
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
    { key: "name", header: "Name" },
    { key: "code", header: "Code", render: (b: Branch) => <span className="font-mono text-xs">{b.code}</span> },
    { key: "address", header: "Address", render: (b: Branch) => b.address ?? "—" },
    {
      key: "is_active",
      header: "Status",
      render: (b: Branch) =>
        b.is_active ? <span className="badge-green">Active</span> : <span className="badge-gray">Inactive</span>,
    },
    {
      key: "actions",
      header: "",
      render: (b: Branch) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button className="btn-secondary btn-sm" onClick={() => resetPassword(b)}>
            Reset password
          </button>
          <button
            className={`btn-sm ${b.is_active ? "btn-danger" : "btn-primary"}`}
            onClick={() => toggleActive(b)}
          >
            {b.is_active ? "Deactivate" : "Activate"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1>Branches</h1>
        <button className="btn-primary" onClick={() => setCreateModal(true)}>
          + New branch
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={8} /></div>
      ) : (
        <Table
          columns={columns as Parameters<typeof Table>[0]["columns"]}
          rows={branches as unknown as Record<string, unknown>[]}
          keyField={"id" as never}
          emptyMessage="No branches yet."
        />
      )}

      {/* Create branch modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="New branch" size="sm">
        <CreateBranchForm
          onSubmit={async (name, address) => {
            setCreateModal(false);
            await createBranch(name, address);
          }}
        />
      </Modal>

      {/* Credentials shown once */}
      <Modal
        open={!!provisioned}
        onClose={() => setProvisioned(null)}
        title="Branch created — save credentials"
        size="sm"
      >
        {provisioned && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              This password is shown <strong>once</strong> and not stored in plaintext. Copy it now.
            </div>
            <div className="space-y-2 text-sm">
              <div><span className="text-slate-400">Branch name:</span> <span className="font-medium">{provisioned.name}</span></div>
              <div><span className="text-slate-400">Branch code:</span> <span className="font-mono font-bold">{provisioned.code}</span></div>
              <div>
                <span className="text-slate-400">Password:</span>{" "}
                <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-900 select-all">
                  {provisioned.plaintext_password}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Branch staff use the code + password to log into the stock and sales terminals.
            </p>
            <button className="btn-primary w-full" onClick={() => setProvisioned(null)}>
              I've saved the credentials
            </button>
          </div>
        )}
      </Modal>

      {/* Password reset result */}
      <Modal
        open={!!resetResult}
        onClose={() => setResetResult(null)}
        title="Password reset — save new credentials"
        size="sm"
      >
        {resetResult && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              New password shown once only.
            </div>
            <div className="text-sm space-y-1">
              <div><span className="text-slate-400">Code:</span> <span className="font-mono font-bold">{resetResult.branch_code}</span></div>
              <div>
                <span className="text-slate-400">New password:</span>{" "}
                <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded select-all">
                  {resetResult.new_password}
                </span>
              </div>
            </div>
            <button className="btn-primary w-full" onClick={() => setResetResult(null)}>Done</button>
          </div>
        )}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismiss} />}
    </>
  );
}

function CreateBranchForm({ onSubmit }: { onSubmit: (name: string, address: string) => void }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(name, address); }}
      className="space-y-4"
    >
      <div>
        <label className="label">Branch name <span className="text-red-500">*</span></label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
      </div>
      <div>
        <label className="label">Address</label>
        <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <button type="submit" className="btn-primary w-full" disabled={!name.trim()}>
        Create branch
      </button>
    </form>
  );
}


