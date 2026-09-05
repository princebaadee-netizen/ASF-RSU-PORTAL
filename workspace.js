let currentDepartment = "";
let currentRole = "";
let viewingDepartment = "";
let viewingIsShared = false;
let currentFiles = [];
let renderVersion = 0;
let currentDepartmentStorage = "";
let viewDepartmentStorage = "";
const selectedPaths = new Set();

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
  document.getElementById("deptTitle").textContent = currentDepartment + " Workspace";

  await loadDepartmentList();
  await discoverRootFolders();
  const optionValues = Array.from(document.querySelectorAll("#deptSwitcher option"))
    .map((o) => o.value)
    .filter((o) => o !== "");
  currentDepartment = matchDepartmentName(profile.department, optionValues);
  viewingDepartment = currentDepartment;
  const switcherEl = document.getElementById("deptSwitcher");
  if (!Array.from(switcherEl.options).some((o) => o.value === currentDepartment)) {
    const fallbackOpt = document.createElement("option");
    fallbackOpt.value = currentDepartment;
    fallbackOpt.textContent = currentDepartment;
    switcherEl.appendChild(fallbackOpt);
  }
  switcherEl.value = currentDepartment;
  currentDepartmentStorage = resolveFolderName(currentDepartment);
  viewDepartmentStorage = resolveFolderName(viewingDepartment);
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

  const placeholderOpt = document.createElement("option");
  placeholderOpt.value = "";
  placeholderOpt.textContent = "Select a department...";
  switcher.appendChild(placeholderOpt);

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
    viewDepartmentStorage = viewingIsShared ? "Shared" : resolveFolderName(viewingDepartment);
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

let currentFilesBasePath = "";

async function loadFiles() {
  renderVersion++;
  selectedPaths.clear();
  updateBulkBar();
  const folder = document.getElementById("viewFolderSelect").value;
  const path = viewingIsShared ? "Shared/" + folder : viewDepartmentStorage + "/" + folder;
  currentFilesBasePath = path;

  const fileListEl = document.getElementById("fileList");
  fileListEl.innerHTML = '<li class="loading">Loading files...</li>';

  const { files, error } = await deepListStorage(path);

  if (error) {
    currentFiles = [];
    fileListEl.innerHTML = "<li>Error loading files: " + error.message + "</li>";
    return;
  }

  if (files.length === 0) {
    currentFiles = [];
    fileListEl.innerHTML = "<li>No files yet.</li>";
    return;
  }

  currentFiles = files;
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

    const fullPath = item.folderPath + "/" + item.name;
    const li = document.createElement("li");
    const meta = [];
    if (item.metadata && item.metadata.size) meta.push(formatFileSize(item.metadata.size));
    if (item.metadata && item.metadata.mimetype) meta.push(item.metadata.mimetype);
    if (item.created_at) meta.push(formatDate(item.created_at));

    const selectBox = document.createElement("input");
    selectBox.type = "checkbox";
    selectBox.className = "file-select";
    selectBox.value = fullPath;
    selectBox.checked = selectedPaths.has(fullPath);
    li.appendChild(selectBox);

    const nameSpan = document.createElement("span");
    nameSpan.className = "file-name";
    nameSpan.textContent = item.name;
    li.appendChild(nameSpan);

    if (item.folderPath && item.folderPath.length > currentFilesBasePath.length) {
      const subSpan = document.createElement("span");
      subSpan.className = "file-subfolder";
      subSpan.textContent = "in " + item.folderPath.slice(currentFilesBasePath.length + 1) + "/";
      li.appendChild(subSpan);
    }

    if (meta.length) {
      const metaSpan = document.createElement("span");
      metaSpan.className = "file-meta";
      metaSpan.textContent = meta.join(" \u00B7 ");
      li.appendChild(metaSpan);
    }

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
      delBtn.addEventListener("click", () => deleteFile(fullPath));
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
      const filePath = (viewingIsShared ? "Shared" : currentDepartmentStorage) + "/" + folder + "/" + pathParts.join("/");

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
      statusEl.textContent = failedFiles.length + " upload(s) failed: " + failedFiles[0];
      statusEl.style.color = "var(--danger)";
    } else {
      statusEl.textContent = selectedFiles.length + " document(s) uploaded successfully!";
      statusEl.style.color = "";
      fileInput.value = "";
      folderInput.value = "";
      if (viewingIsShared || viewingDepartment === currentDepartment) await loadFiles();
    }
  } catch (error) {
    statusEl.textContent = "Upload failed: " + (error && error.message ? error.message : "please try again.");
    statusEl.style.color = "var(--danger)";
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

const bulkFileListEl = document.getElementById("fileList");
const bulkSelectAllEl = document.getElementById("bulkSelectAll");
const bulkCountEl = document.getElementById("bulkCount");
const bulkDownloadBtn = document.getElementById("bulkDownloadBtn");
const bulkDeleteBtn = document.getElementById("bulkDeleteBtn");

function currentDeletable() {
  return viewingIsShared
    ? currentRole === "executive"
    : viewingDepartment === currentDepartment;
}

function updateBulkBar() {
  const count = selectedPaths.size;
  bulkCountEl.textContent = count + " selected";
  bulkDownloadBtn.disabled = count === 0;
  bulkDeleteBtn.disabled = count === 0 || !currentDeletable();
  const visible = bulkFileListEl.querySelectorAll(".file-select");
  bulkSelectAllEl.checked = visible.length > 0 && count === visible.length;
}

bulkSelectAllEl.addEventListener("change", function () {
  selectedPaths.clear();
  bulkFileListEl.querySelectorAll(".file-select").forEach((cb) => {
    cb.checked = this.checked;
    if (this.checked) selectedPaths.add(cb.value);
  });
  updateBulkBar();
});

bulkFileListEl.addEventListener("change", (e) => {
  if (!e.target.classList.contains("file-select")) return;
  if (e.target.checked) {
    selectedPaths.add(e.target.value);
  } else {
    selectedPaths.delete(e.target.value);
  }
  updateBulkBar();
});

bulkDownloadBtn.addEventListener("click", async () => {
  const paths = Array.from(selectedPaths);
  for (const fullPath of paths) {
    const { data } = await supabaseClient.storage
      .from("documents")
      .createSignedUrl(fullPath, 300);
    if (data?.signedUrl) {
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.target = "_blank";
      a.rel = "noopener";
      a.click();
    }
  }
});

bulkDeleteBtn.addEventListener("click", async () => {
  const paths = Array.from(selectedPaths);
  if (!paths.length) return;
  const confirmed = confirm("Delete " + paths.length + " selected file(s)? This cannot be undone.");
  if (!confirmed) return;

  const { error } = await supabaseClient.storage
    .from("documents")
    .remove(paths);

  if (error) {
    alert("Delete failed: " + error.message);
  } else {
    selectedPaths.clear();
    loadFiles();
  }
});

loadWorkspace();