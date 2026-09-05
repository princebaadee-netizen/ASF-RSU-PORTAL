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
  await discoverRootFolders();
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

  const placeholderOpt = document.createElement("option");
  placeholderOpt.value = "";
  placeholderOpt.textContent = "Select a department...";
  select.appendChild(placeholderOpt);

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

  const optionValues = Array.from(select.querySelectorAll("option"))
    .map((o) => o.value)
    .filter((o) => o !== "");
  currentDept = matchDepartmentName(currentDept, optionValues);
  if (!Array.from(select.options).some((o) => o.value === currentDept)) {
    const fallbackOpt = document.createElement("option");
    fallbackOpt.value = currentDept;
    fallbackOpt.textContent = currentDept;
    select.appendChild(fallbackOpt);
  }
  select.value = currentDept;
  const currentTitle = document.getElementById("archTitle");
  if (currentTitle) currentTitle.textContent = currentDept + " Archive";
}

async function loadFiles() {
  renderVersion++;
  const dept = document.getElementById("archDeptSelect").value;
  const folder = document.getElementById("archFolderSelect").value;
  const deptStorage = dept === "Shared" ? "Shared" : resolveFolderName(dept);

  if (!dept) return;

  const path = deptStorage + "/" + folder;

  const listEl = document.getElementById("archFileList");
  listEl.innerHTML = '<li class="loading">Loading files...</li>';

  const { files, error } = await deepListStorage(path);

  if (error) {
    allFiles = [];
    listEl.innerHTML = "<li>Error loading files: " + error.message + "</li>";
    return;
  }

  if (files.length === 0) {
    allFiles = [];
    listEl.innerHTML = "<li>No files found here.</li>";
    return;
  }

  allFiles = files;
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
  const deptStorage = dept === "Shared" ? "Shared" : resolveFolderName(dept);
  const path = deptStorage + "/" + document.getElementById("archFolderSelect").value;
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

    if (item.folderPath && item.folderPath.length > path.length) {
      const subSpan = document.createElement("span");
      subSpan.className = "file-subfolder";
      subSpan.textContent = "in " + item.folderPath.slice(path.length + 1) + "/";
      li.appendChild(subSpan);
    }

    if (meta.length) {
      const metaSpan = document.createElement("span");
      metaSpan.className = "file-meta";
      metaSpan.textContent = meta.join(" \u00B7 ");
      li.appendChild(metaSpan);
    }

    const fullPath = item.folderPath + "/" + item.name;
    const { data: signedUrl, error: urlError } = await supabaseClient.storage
      .from("documents")
      .createSignedUrl(fullPath, 300);

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
        deleteFile(fullPath)
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