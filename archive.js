const SUPABASE_URL = "https://buywrhouqomubszwfqck.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_8GvFU7sm8pt1N9s8Ingrjg_4074Fzdm";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let allFiles = [];

async function loadArchive() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error || !data.user) {
    window.location.href = "login.html";
    return;
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

  data.forEach((dept) => {
    const opt = document.createElement("option");
    opt.value = dept.Name;
    opt.textContent = dept.Name;
    select.appendChild(opt);
  });
}

async function loadFiles() {
  const dept = document.getElementById("archDeptSelect").value;
  const folder = document.getElementById("archFolderSelect").value;

  if (!dept) return;

  const path = dept + "/" + folder;

  const { data, error } = await supabaseClient.storage
    .from("documents")
    .list(path, { limit: 100 });

  const listEl = document.getElementById("archFileList");
  listEl.innerHTML = "";

  if (error || !data || data.length === 0) {
    allFiles = [];
    listEl.innerHTML = "<li>No files found here.</li>";
    return;
  }

  allFiles = data;
  renderFiles(allFiles);
}

function renderFiles(files) {
  const listEl = document.getElementById("archFileList");
  listEl.innerHTML = "";

  if (files.length === 0) {
    listEl.innerHTML = "<li>No matching files.</li>";
    return;
  }

  files.forEach((item) => {
    const li = document.createElement("li");
    const uploadDate = item.created_at
      ? new Date(item.created_at).toLocaleDateString()
      : "Unknown date";
    li.textContent = item.name + " — uploaded " + uploadDate;
    listEl.appendChild(li);
  });
}

document.getElementById("archDeptSelect").addEventListener("change", loadFiles);
document.getElementById("archFolderSelect").addEventListener("change", loadFiles);

document.getElementById("archSearchInput").addEventListener("input", function () {
  const term = this.value.toLowerCase();
  const filtered = allFiles.filter((item) => item.name.toLowerCase().includes(term));
  renderFiles(filtered);
});

loadArchive();