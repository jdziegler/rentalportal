"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Member = {
  id: string;
  role: string;
  user: { id: string; name: string | null; email: string; image: string | null };
};

type Invite = {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  expiresAt: string;
};

type Team = {
  id: string;
  name: string;
  members: Member[];
  invites: Invite[];
};

const ROLES = [
  { value: "manager", label: "Manager" },
  { value: "viewer", label: "Viewer" },
  { value: "maintenance", label: "Maintenance" },
];

const roleStyles: Record<string, string> = {
  owner: "bg-purple-100 text-purple-700 hover:bg-purple-100",
  manager: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  viewer: "bg-gray-100 text-gray-700 hover:bg-gray-100",
  maintenance: "bg-orange-100 text-orange-700 hover:bg-orange-100",
};

export default function TeamManagement() {
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function loadTeam() {
    const res = await fetch("/api/team");
    const data = await res.json();
    setTeam(data.team);
    setLoading(false);
  }

  useEffect(() => {
    loadTeam();
  }, []);

  async function handleCreateTeam() {
    setLoading(true);
    await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "My Team" }),
    });
    await loadTeam();
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail) return;

    setInviting(true);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/team/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
    } else {
      setSuccess(`Invite sent to ${inviteEmail}`);
      setInviteEmail("");
      await loadTeam();
    }
    setInviting(false);
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm("Remove this team member?")) return;
    await fetch(`/api/team/members/${userId}`, { method: "DELETE" });
    await loadTeam();
  }

  async function handleChangeRole(userId: string, role: string) {
    await fetch(`/api/team/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    await loadTeam();
  }

  function copyInviteLink(token: string) {
    const url = `${window.location.origin}/invite?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Team</h1>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Team</h1>
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600 mb-4">
            Create a team to invite property managers, assistants, or
            co-owners.
          </p>
          <Button onClick={handleCreateTeam}>Create Team</Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Team</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium">
            Dismiss
          </button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-md">
          {success}
          <button
            onClick={() => setSuccess(null)}
            className="ml-2 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Invite form */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Invite Member
        </h2>
        <form onSubmit={handleInvite} className="flex gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Email address"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={inviting}>
            {inviting ? "Sending..." : "Send Invite"}
          </Button>
        </form>
      </div>

      {/* Members */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Members ({team.members.length})
        </h2>
        <div className="space-y-3">
          {team.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between py-2"
            >
              <div className="flex items-center gap-3">
                {member.user.image ? (
                  <img
                    src={member.user.image}
                    alt=""
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                    {(member.user.name || member.user.email)[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {member.user.name || member.user.email}
                  </p>
                  <p className="text-xs text-gray-500">{member.user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {member.role === "owner" ? (
                  <Badge className={roleStyles.owner}>Owner</Badge>
                ) : (
                  <>
                    <select
                      value={member.role}
                      onChange={(e) =>
                        handleChangeRole(member.user.id, e.target.value)
                      }
                      className="border border-gray-300 rounded px-2 py-1 text-xs"
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveMember(member.user.id)}
                      className="text-red-600 hover:text-red-700 text-xs"
                    >
                      Remove
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invites */}
      {team.invites.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Pending Invites ({team.invites.length})
          </h2>
          <div className="space-y-3">
            {team.invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between py-2"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {invite.email}
                  </p>
                  <p className="text-xs text-gray-500">
                    <Badge className={roleStyles[invite.role] || roleStyles.viewer}>
                      {invite.role}
                    </Badge>
                    <span className="ml-2">
                      Expires{" "}
                      {new Date(invite.expiresAt).toLocaleDateString()}
                    </span>
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyInviteLink(invite.token)}
                  className="text-xs"
                >
                  {copied === invite.token ? "Copied!" : "Copy Link"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
