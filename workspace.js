let currentDepartment = "";
let currentRole = "";
let viewingDepartment = "";
let viewingIsShared = false;
let currentFiles = [];
let renderVersion = 0;

async function loadWorkspace() {
  const user = await requireAuth();
  if (!user) return;

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("department, role")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    document.getElementById("deptTitle").textContent = "No department found";
    return;
  }

  currentDepartment = profile.department;
  currentRole = profile.role;
  viewingDepartment = profile.department;
  document.getElementById("deptTitle").textContent = currentDepartment + " Workspace";

  await loadDepartmentList();
  updateUploadVisibility();
  loadFiles();
}

async function loadDepartmentList() {
  const switcherSection = document.getElementById("deptSwitcher").closest(".workspace-section");
  const switcher = document.getElementById("deptSwitcher");

  switcherSection.style.display = "";

  const { data, error } = await supabaseClient
    .from("departments")
    .select("Name, Parent_group")
    .order("Name", { ascending: true });

  switcher.innerHTML = "";

  if (error || !data) {
    switcher.innerHTML = "<option>Could not load departments</option>";
    return;
  }

  const sharedOpt = document.createElement("option");
  sharedOpt.value = "Shared";
  sharedOpt.textContent = "Shared (Fellowship-wide)";
  switcher.appendChild(sharedOpt);

  const grouped = {};
  const standalone = [];

  data.forEach((dept) => {
    if (dept.Parent_group) {
      if (!grouped[dept.Parent_group]) grouped[dept.Parent_group] = [];
      grouped[dept.Parent_group].push(dept.Name);
    } else {
      standalone.push(dept.Name);
    }
  });

  standalone.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    if (name === currentDepartment) opt.selected = true;
    switcher.appendChild(opt);
  });

  Object.keys(grouped).forEach((groupName) => {
    const optgroup = document.createElement("optgroup");
    optgroup.label = groupName;

    grouped[groupName].forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      if (name === currentDepartment) opt.selected = true;
      optgroup.appendChild(opt);
    });

    switcher.appendChild(optgroup);
  });

  switcher.addEventListener("change", () => {
    const val = switcher.value;
    viewingIsShared = val === "Shared";
    viewingDepartment = val;
    document.getElementById("deptTitle").textContent = viewingIsShared
      ? "Shared (Fellowship-wide)"
      : viewingDepartment + (viewingDepartment !== currentDepartment ? " (viewing)" : " Workspace");
    updateUploadVisibility();
    loadFiles();
  });
}

function updateUploadVisibility() {
  const uploadSection = document.getElementById("uploadBtn").closest(".workspace-section");
  const isOwnDept = !viewingIsShared && viewingDepartment === currentDepartment;
  const isShared = viewingIsShared && currentRole === "executive";
  uploadSection.style.display = (isOwnDept || isShared) ? "" : "none";
}

async function loadFiles() {
  renderVersion++;
  const folder = document.getElementById("viewFolderSelect").value;
  const path = viewingIsShared ? "Shared/" + folder : viewingDepartment + "/" + folder;

  const fileListEl = document.getElementById("fileList");
  fileListEl.innerHTML = '<li class="loading">Loading files...</li>';

  const { data, error } = await supabaseClient.storage
    .from("documents")
    .list(path, { limit: 100 });

  if (error || !data || data.length === 0) {
    currentFiles = [];
    fileListEl.innerHTML = "<li>No files yet.</li>";
    return;
  }

  currentFiles = data
    .filter((item) => item.id)
    .map((item) => ({ ...item, folderPath: path }));
  renderFileList(currentFiles);
}

async function renderFileList(files) {
  const currentRender = ++renderVersion;
  const fileListEl = document.getElementById("fileList");
  fileListEl.innerHTML = "";

  if (files.length === 0) {
    fileListEl.innerHTML = "<li>No matching files.</li>";
    return;
  }

  const canDelete = viewingIsShared
    ? currentRole === "executive"
    : viewingDepartment === currentDepartment;

  for (const item of files) {
    if (currentRender !== renderVersion) return;

    const li = document.createElement("li");
    const meta = [];
    if (item.metadata && item.metadata.size) meta.push(formatFileSize(item.metadata.size));
    if (item.metadata && item.metadata.mimetype) meta.push(item.metadata.mimetype);
    if (item.created_at) meta.push(formatDate(item.created_at));

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
      .createSignedUrl(item.folderPath + "/" + item.name, 300);

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
      delBtn.addEventListener("click", () => deleteFile(item.folderPath + "/" + item.name));
      li.appendChild(delBtn);
    }

    if (currentRender !== renderVersion) return;
    fileListEl.appendChild(li);
  }
}

async function deleteFile(fullPath) {
  const confirmed = confirm("Are you sure you want to delete this file? This cannot be undone.");
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

document.getElementById("uploadBtn").addEventListener("click", async () => {
  const fileInput = document.getElementById("fileInput");
  const folderInput = document.getElementById("folderInput");
  const folder = document.getElementById("folderSelect").value;
  const statusEl = document.getElementById("uploadStatus");
  const uploadButton = document.getElementById("uploadBtn");
  const selectedFiles = [...fileInput.files, ...folderInput.files];

  if (!selectedFiles.length) {
    statusEl.textContent = "Please choose one or more documents or a folder first.";
    return;
  }

  uploadButton.disabled = true;
  statusEl.textContent = "Uploading 0 of " + selectedFiles.length + "...";

  try {
    const failedFiles = [];

    for (let index = 0; index < selectedFiles.length; index++) {
      const file = selectedFiles[index];
      const relativePath = file.webkitRelativePath || file.name;
      const pathParts = relativePath
        .split(/[\\/]/)
        .map((part) => part.replace(/[^a-zA-Z0-9._ -]/g, "_").trim())
        .filter(Boolean);
      const filePath = (viewingIsShared ? "Shared" : currentDepartment) + "/" + folder + "/" + pathParts.join("/");

      if (!pathParts.length) {
        failedFiles.push(file.name || "Unnamed file");
        continue;
      }

      const { error } = await supabaseClient.storage
        .from("documents")
        .upload(filePath, file, { upsert: true });

      if (error) failedFiles.push(file.name + ": " + error.message);
      statusEl.textContent = "Uploading " + (index + 1) + " of " + selectedFiles.length + "...";
    }

    if (failedFiles.length) {
      statusEl.textContent = failedFiles.length + " upload(s) failed. Check the selected files and try again.";
    } else {
      statusEl.textContent = selectedFiles.length + " document(s) uploaded successfully!";
      fileInput.value = "";
      folderInput.value = "";
      if (viewingIsShared || viewingDepartment === currentDepartment) await loadFiles();
    }
  } catch (error) {
    statusEl.textContent = "Upload failed. Please try again.";
  } finally {
    uploadButton.disabled = false;
  }
});

document.getElementById("viewFolderSelect").addEventListener("change", loadFiles);

document.getElementById("workspaceSearchInput").addEventListener("input", function () {
  const term = this.value.toLowerCase();
  const filtered = currentFiles.filter((item) => item.name.toLowerCase().includes(term));
  renderFileList(filtered);
});

loadWorkspace();