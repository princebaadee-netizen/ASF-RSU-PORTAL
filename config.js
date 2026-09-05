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

function resolveFolderName(displayName) {
  if (!rootFolderNames || rootFolderNames.length === 0) return displayName;

  const exact = rootFolderNames.find((f) => f === displayName);
  if (exact) return exact;

  const lower = displayName.toLowerCase();
  const caseInsensitive = rootFolderNames.find((f) => f.toLowerCase() === lower);
  if (caseInsensitive) return caseInsensitive;

  const fuzzy = rootFolderNames.find((f) => {
    const a = f.toLowerCase();
    const b = lower;
    return a.length >= 4 && b.length >= 4
      ? a.startsWith(b) || b.startsWith(a)
      : a === b;
  });
  if (fuzzy) return fuzzy;

  return displayName;
}

function matchDepartmentName(name, optionValues) {
  if (!name) return "";
  if (optionValues.includes(name)) return name;

  const lower = name.toLowerCase();
  const caseInsensitive = optionValues.find((o) => o.toLowerCase() === lower);
  if (caseInsensitive) return caseInsensitive;

  const fuzzy = optionValues.find((o) => {
    const a = o.toLowerCase();
    const b = lower;
    return a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a));
  });
  return fuzzy || name;
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
