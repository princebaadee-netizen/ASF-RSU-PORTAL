let allFiles = [];
let renderVersion = 0;
let currentDept = "";
let currentRole = "";

async function loadArchive() {
  const user = await requireAuth();
  if (!user) return;

  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("department, role")
    .eq("user_id", user.id)
    .single();

  if (profile) {
    currentDept = profile.department;
    currentRole = profile.role;
  }

  await loadDepartments();
  loadFiles();
}

async function loadDepartments() {
  const { data, error } = await supabaseClient
    .from("departments")
    .select("Name")
    .order("Name", { ascending: true });

  const select = document.getElementById("archDeptSelect");
  select.innerHTML = "";

  if (error || !data) {
    select.innerHTML = "<option>Could not load departments</option>";
    return;
  }

  const sharedOpt = document.createElement("option");
  sharedOpt.value = "Shared";
  sharedOpt.textContent = "Shared (Fellowship-wide)";
  select.appendChild(sharedOpt);

  data.forEach((dept) => {
    const opt = document.createElement("option");
    opt.value = dept.Name;
    opt.textContent = dept.Name;
    select.appendChild(opt);
  });
}

async function loadFiles() {
  renderVersion++;
  const dept = document.getElementById("archDeptSelect").value;
  const folder = document.getElementById("archFolderSelect").value;

  if (!dept) return;

  const path = dept + "/" + folder;

  const listEl = document.getElementById("archFileList");
  listEl.innerHTML = '<li class="loading">Loading files...</li>';

  const { data, error } = await supabaseClient.storage
    .from("documents")
    .list(path, { limit: 100 });

  if (error || !data || data.length === 0) {
    allFiles = [];
    listEl.innerHTML = "<li>No files found here.</li>";
    return;
  }

  allFiles = data.filter((item) => item.id);
  renderFiles(allFiles);
}

async function renderFiles(files) {
  const currentRender = ++renderVersion;
  const listEl = document.getElementById("archFileList");
  listEl.innerHTML = "";

  if (files.length === 0) {
    listEl.innerHTML = "<li>No matching files.</li>";
    return;
  }

  const dept = document.getElementById("archDeptSelect").value;
  const folder = document.getElementById("archFolderSelect").value;
  const canDelete = dept === "Shared"
    ? currentRole === "executive"
    : dept === currentDept;

  for (const item of files) {
    if (currentRender !== renderVersion) return;

    const li = document.createElement("li");
    const meta = [];
    if (item.metadata && item.metadata.size) meta.push(formatFileSize(item.metadata.size));
    if (item.metadata && item.metadata.mimetype) meta.push(item.metadata.mimetype);
    if (item.created_at) meta.push("uploaded " + formatDate(item.created_at));

    const nameSpan = document.createElement("span");
    nameSpan.className = "file-name";
    nameSpan.textContent = item.name;
    li.appendChild(nameSpan);

    if (meta.length) {
      const metaSpan = document.createElement("span");
      metaSpan.className = "file-meta";
      metaSpan.textContent = meta.join(" \u00B7 ");
      li.appendChild(metaSpan);
    }

    const { data: signedUrl, error: urlError } = await supabaseClient.storage
      .from("documents")
      .createSignedUrl(dept + "/" + folder + "/" + item.name, 300);

    if (!urlError && signedUrl?.signedUrl) {
      const downloadLink = document.createElement("a");
      downloadLink.href = signedUrl.signedUrl;
      downloadLink.textContent = "Download";
      downloadLink.target = "_blank";
      downloadLink.rel = "noopener";
      li.appendChild(downloadLink);
    }

    if (canDelete) {
      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", () =>
        deleteFile(dept + "/" + folder + "/" + item.name)
      );
      li.appendChild(delBtn);
    }

    if (currentRender !== renderVersion) return;
    listEl.appendChild(li);
  }
}

async function deleteFile(fullPath) {
  const confirmed = confirm("Delete this file? This cannot be undone.");
  if (!confirmed) return;

  const { error } = await supabaseClient.storage
    .from("documents")
    .remove([fullPath]);

  if (error) {
    alert("Delete failed: " + error.message);
  } else {
    loadFiles();
  }
}

document.getElementById("archDeptSelect").addEventListener("change", loadFiles);
document.getElementById("archFolderSelect").addEventListener("change", loadFiles);

document.getElementById("archSearchInput").addEventListener("input", function () {
  const term = this.value.toLowerCase();
  const filtered = allFiles.filter((item) => item.name.toLowerCase().includes(term));
  renderFiles(filtered);
});

loadArchive();