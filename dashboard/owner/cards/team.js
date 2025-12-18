import { escapeHtml } from "../utils.js";

export function initTeamCard({ authorizedFetch, hasOwnerPrivileges }) {
  function renderTeamTable({ tableEl, users, canEdit }) {
    if (!tableEl) return;
    if (!users.length) {
      tableEl.innerHTML = '<div class="muted">No teammates yet.</div>';
      return;
    }

    tableEl.innerHTML = `
      <div class="table" role="table" aria-label="Team members">
        ${users
          .map(
            (u) => `
            <div class="table-row" role="row">
              <div class="table-cell" role="cell">
                <div style="font-weight:600;">${escapeHtml(u.email || "")}</div>
                <div class="muted" style="font-size:0.8rem;">User ID: ${escapeHtml(u.id || "")}</div>
              </div>
              <div class="table-cell" role="cell">
                <label class="muted" style="font-size:0.75rem;">Role</label>
                ${
                  canEdit
                    ? `<select data-user-id="${escapeHtml(u.id)}" class="role-select">
                      ${["owner", "admin", "staff", "viewer"]
                        .map((r) => `<option value="${r}" ${u.role === r ? "selected" : ""}>${r}</option>`)
                        .join("")}
                    </select>`
                    : `<span class="pill muted">${escapeHtml(u.role || "")}</span>`
                }
              </div>
            </div>
          `,
          )
          .join("")}
      </div>
    `;
  }

  function renderTeamSummary({ containerEl, users, canEdit }) {
    if (!containerEl) return;
    if (!users.length) {
      containerEl.innerHTML = '<div class="muted">No users found for this business.</div>';
      return;
    }

    containerEl.innerHTML = users
      .map((u) => {
        const role = escapeHtml(u.role || "");
        const email = escapeHtml(u.email || "");
        const name = escapeHtml(u.name || "");

        const roleControls = canEdit
          ? `<select data-user-id="${escapeHtml(u.id)}" class="pill">
              <option value="owner" ${role === "owner" ? "selected" : ""}>Owner</option>
              <option value="admin" ${role === "admin" ? "selected" : ""}>Admin</option>
              <option value="staff" ${role === "staff" ? "selected" : ""}>Staff</option>
              <option value="viewer" ${role === "viewer" ? "selected" : ""}>Viewer</option>
            </select>`
          : `<span class="pill muted">${role}</span>`;

        return `
          <div class="metric-row" style="align-items: center; gap: 0.5rem;">
            <div>
              <div style="font-weight: 600;">${name || email}</div>
              <div class="muted" style="font-size: 0.8rem;">${email}</div>
            </div>
            ${roleControls}
          </div>
        `;
      })
      .join("");
  }

  async function updateUserRole(userId, role, selectEl) {
    try {
      const res = await authorizedFetch(`/v1/owner/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || `Unable to update role (${res.status})`);
      }
      selectEl?.classList.remove("error");
    } catch (err) {
      selectEl?.classList.add("error");
      alert(err?.message || "Role update failed.");
    }
  }

  function attachRoleHandlers(rootEl) {
    if (!rootEl) return;
    rootEl.querySelectorAll("select[data-user-id]").forEach((select) => {
      select.addEventListener("change", (evt) => {
        const userId = evt.target.getAttribute("data-user-id");
        const role = evt.target.value;
        if (!userId) return;
        updateUserRole(userId, role, evt.target);
      });
    });
  }

  async function loadTeam() {
    const teamContent = document.getElementById("team-content");
    const teamTable = document.getElementById("team-table");
    if (!teamContent && !teamTable) return;

    if (teamContent) teamContent.innerHTML = '<div class="loading">Loading team...</div>';
    if (teamTable) teamTable.textContent = "Loading team...";

    try {
      const res = await authorizedFetch("/v1/owner/users");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || `Unable to load team (${res.status})`);

      const users = Array.isArray(data?.users) ? data.users : [];
      const canEdit = hasOwnerPrivileges();

      renderTeamSummary({ containerEl: teamContent, users, canEdit });
      renderTeamTable({ tableEl: teamTable, users, canEdit });

      if (canEdit) {
        attachRoleHandlers(teamContent);
        attachRoleHandlers(teamTable);
      }
    } catch (err) {
      if (teamContent) teamContent.innerHTML = `<div class="error">${escapeHtml(err?.message || "Unable to load team.")}</div>`;
      if (teamTable) teamTable.textContent = err?.message || "Unable to load team.";
    }
  }

  return { loadTeam };
}

