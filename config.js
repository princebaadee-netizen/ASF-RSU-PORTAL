const SUPABASE_URL = "https://buywrhouqomubszwfqck.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_8GvFU7sm8pt1N9s8Ingrjg_4074Fzdm";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function requireAuth() {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error || !data.user) {
    window.location.href = "login.html";
    return null;
  }
  document.body.classList.add("authed");
  return data.user;
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString();
}

function getFileType(name) {
  const ext = name.split(".").pop();
  return ext ? ext.toUpperCase() : "";
}

let rootFolderNames = null;

async function discoverRootFolders() {
  const { data, error } = await supabaseClient.storage
    .from("documents")
    .list("", { limit: 200 });

  rootFolderNames = error || !data
    ? []
    : data
      .filter((item) => item.metadata === null && item.name && item.name !== "Shared")
      .map((item) => item.name);
}

function normalizeName(name) {
  return (name || "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function bestPrefixMatch(name, candidates) {
  const target = normalizeName(name);
  if (!target) return null;
  let best = null;
  let bestLen = 0;
  for (const candidate of candidates) {
    const c = normalizeName(candidate);
    let i = 0;
    while (i < c.length && i < target.length && c[i] === target[i]) i++;
    if (i > bestLen) {
      bestLen = i;
      best = candidate;
    }
  }
  return bestLen >= 5 ? best : null;
}

function resolveFolderName(displayName) {
  if (!rootFolderNames || rootFolderNames.length === 0) return displayName;
  if (rootFolderNames.includes(displayName)) return displayName;

  const target = normalizeName(displayName);
  const caseInsensitive = rootFolderNames.find((f) => normalizeName(f) === target);
  if (caseInsensitive) return caseInsensitive;

  const prefix = bestPrefixMatch(displayName, rootFolderNames);
  if (prefix) return prefix;

  return displayName;
}

function matchDepartmentName(name, optionValues) {
  if (!name) return "";
  if (optionValues.includes(name)) return name;

  const target = normalizeName(name);
  const caseInsensitive = optionValues.find((o) => normalizeName(o) === target);
  if (caseInsensitive) return caseInsensitive;

  const prefix = bestPrefixMatch(name, optionValues);
  if (prefix) return prefix;

  return name;
}

async function deepListStorage(folderPath, depth = 0) {
  const { data, error } = await supabaseClient.storage
    .from("documents")
    .list(folderPath, { limit: 200 });

  if (error || !data) return { files: [], error };

  const files = [];
  const subFolders = [];

  for (const item of data) {
    if (item.id) {
      files.push({ ...item, folderPath });
    } else if (item.name && item.metadata === null && depth < 5) {
      subFolders.push(item.name);
    }
  }

  for (const sub of subFolders) {
    const deeper = await deepListStorage(folderPath + "/" + sub, depth + 1);
    if (deeper.error) return { files: [], error: deeper.error };
    files.push(...deeper.files);
  }

  return { files };
}

function canPreviewFileName(name) {
  const ext = (name.split(".").pop() || "").toLowerCase();
  return ["pdf", "jpg", "jpeg", "png", "gif", "webp", "txt", "csv", "md", "json", "svg"].includes(ext);
}

async function openFilePreview(fullPath, fileName) {
  const existing = document.getElementById("filePreviewModal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "filePreviewModal";
  modal.className = "preview-modal";

  const box = document.createElement("div");
  box.className = "preview-box";

  const head = document.createElement("div");
  head.className = "preview-head";

  const title = document.createElement("span");
  title.className = "preview-title";
  title.textContent = fileName;

  const closeBtn = document.createElement("button");
  closeBtn.className = "preview-close";
  closeBtn.textContent = "Close";
  closeBtn.addEventListener("click", () => modal.remove());

  head.appendChild(title);
  head.appendChild(closeBtn);

  const body = document.createElement("div");
  body.className = "preview-body";
  body.innerHTML = '<div class="preview-loading">Loading preview...</div>';

  const footer = document.createElement("div");
  footer.className = "preview-footer";

  const downloadBtn = document.createElement("a");
  downloadBtn.className = "btn";
  downloadBtn.textContent = "Download";
  downloadBtn.target = "_blank";
  downloadBtn.rel = "noopener";

  const okBtn = document.createElement("button");
  okBtn.textContent = "Close";
  okBtn.addEventListener("click", () => modal.remove());

  footer.appendChild(downloadBtn);
  footer.appendChild(okBtn);

  box.appendChild(head);
  box.appendChild(body);
  box.appendChild(footer);
  modal.appendChild(box);
  document.body.appendChild(modal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });

  const { data } = await supabaseClient.storage
    .from("documents")
    .createSignedUrl(fullPath, 300, { download: false });

  if (!data || !data.signedUrl) {
    body.innerHTML = '<div class="preview-error">Could not open this file. Try downloading it instead.</div>';
    return;
  }

  downloadBtn.href = data.signedUrl;

  if (canPreviewFileName(fileName)) {
    const iframe = document.createElement("iframe");
    iframe.src = data.signedUrl;
    iframe.title = fileName;
    body.innerHTML = "";
    body.appendChild(iframe);
  } else {
    body.innerHTML = '<div class="preview-error">This file type cannot be previewed in the browser. Use the Download button below.</div>';
  }
}
