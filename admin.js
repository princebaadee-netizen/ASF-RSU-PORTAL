let currentUser = null;
let currentUserRole = "";
let currentDept = "";
let allProfiles = [];

async function initAdmin() {
  currentUser = await requireAuth();
  if (!currentUser) return;

  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("department, role")
    .eq("user_id", currentUser.id)
    .single();

  if (!profile || profile.role !== "executive") {
    document.getElementById("adminTitle").textContent = "Access denied";
    document.getElementById("adminRole").textContent = "Only executives can access the admin panel.";
    document.querySelector(".workspace-section").style.display = "none";
    document.querySelectorAll(".workspace-section")[1].style.display = "none";
    return;
  }

  currentUserRole = profile.role;
  currentDept = profile.department;
  document.getElementById("adminRole").textContent =
    "Logged in as: " + currentUser.email + " (" + currentDept + ")";

  await loadDepartments();
  await loadUsers();
}

async function loadDepartments() {
  const { data, error } = await supabaseClient
    .from("departments")
    .select("Name")
    .order("Name", { ascending: true });

  const selects = [document.getElementById("inviteDept")];

  selects.forEach((select) => {
    select.innerHTML = "";
    if (error || !data) {
      select.innerHTML = "<option>Could not load departments</option>";
      return;
    }
    data.forEach((dept) => {
      const opt = document.createElement("option");
      opt.value = dept.Name;
      opt.textContent = dept.Name;
      select.appendChild(opt);
    });
  });
}

async function loadUsers() {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id, user_id, department, role, created_at")
    .order("department", { ascending: true });

  const tbody = document.getElementById("userTableBody");
  tbody.innerHTML = "";

  if (error || !data) {
    tbody.innerHTML = '<tr><td colspan="4">Could not load users.</td></tr>';
    return;
  }

  allProfiles = data;
  renderUsers(allProfiles);
}

function renderUsers(profiles) {
  const tbody = document.getElementById("userTableBody");
  tbody.innerHTML = "";

  if (profiles.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4">No users found.</td></tr>';
    return;
  }

  profiles.forEach((p) => {
    const tr = document.createElement("tr");

    const tdEmail = document.createElement("td");
    tdEmail.textContent = p.user_id || "—";
    tr.appendChild(tdEmail);

    const tdDept = document.createElement("td");
    tdDept.textContent = p.department || "—";
    tr.appendChild(tdDept);

    const tdRole = document.createElement("td");
    const roleSelect = document.createElement("select");
    roleSelect.className = "inline-role-select";
    ["departmental_head", "executive"].forEach((r) => {
      const opt = document.createElement("option");
      opt.value = r;
      opt.textContent = r === "executive" ? "Executive" : "Dept Head";
      if (r === p.role) opt.selected = true;
      roleSelect.appendChild(opt);
    });
    roleSelect.addEventListener("change", () => updateRole(p.user_id, roleSelect.value));
    tdRole.appendChild(roleSelect);
    tr.appendChild(tdRole);

    const tdActions = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.textContent = "Remove";
    delBtn.addEventListener("click", () => removeUser(p.user_id, p.department));
    tdActions.appendChild(delBtn);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });
}

async function updateRole(userId, newRole) {
  const { error } = await supabaseClient
    .from("profiles")
    .update({ role: newRole })
    .eq("user_id", userId);

  if (error) {
    alert("Failed to update role: " + error.message);
    await loadUsers();
  }
}

async function removeUser(userId, dept) {
  const confirmed = confirm(
    "Remove this user from " + dept + "?\n\nThis removes their profile. Their login account must be deleted separately from the Supabase dashboard."
  );
  if (!confirmed) return;

  const { error } = await supabaseClient
    .from("profiles")
    .delete()
    .eq("user_id", userId);

  if (error) {
    alert("Failed to remove user: " + error.message);
  } else {
    await loadUsers();
  }
}

document.getElementById("inviteForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("inviteEmail").value.trim();
  const dept = document.getElementById("inviteDept").value;
  const role = document.getElementById("inviteRole").value;
  const btn = document.getElementById("inviteBtn");
  const msg = document.getElementById("inviteMsg");

  if (!email || !dept || !role) {
    msg.textContent = "Fill in all fields.";
    msg.style.color = "var(--danger)";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Creating...";
  msg.textContent = "";

  const tempPassword = "Temp-" + Math.random().toString(36).slice(2, 10) + "!";
  const { data: authData, error: authError } = await supabaseClient.auth.signUp({
    email: email,
    password: tempPassword,
  });

  if (authError) {
    msg.textContent = authError.message;
    msg.style.color = "var(--danger)";
    btn.disabled = false;
    btn.textContent = "Send invite";
    return;
  }

  if (authData && authData.user) {
    const { error: profileError } = await supabaseClient
      .from("profiles")
      .insert({ user_id: authData.user.id, department: dept, role: role });

    if (profileError) {
      msg.textContent = "User created but profile setup failed: " + profileError.message;
      msg.style.color = "var(--danger)";
    } else {
      await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password.html",
      });
      msg.textContent = "User created! They'll receive a password reset link at " + email;
      msg.style.color = "var(--green-mid)";
      document.getElementById("inviteEmail").value = "";
    }
  }

  btn.disabled = false;
  btn.textContent = "Send invite";
  await loadUsers();
});

document.getElementById("userSearchInput").addEventListener("input", function () {
  const term = this.value.toLowerCase();
  const filtered = allProfiles.filter(
    (p) =>
      (p.department && p.department.toLowerCase().includes(term)) ||
      (p.role && p.role.toLowerCase().includes(term)) ||
      (p.user_id && p.user_id.toLowerCase().includes(term))
  );
  renderUsers(filtered);
});

initAdmin();
