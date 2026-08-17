const SUPABASE_URL = "https://buywrhouqomubszwfqck.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_8GvFU7sm8pt1N9s8Ingrjg_4074Fzdm";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let currentDepartment = "";   // your own department (used for uploads)
let viewingDepartment = "";   // whichever department you're currently browsing

async function loadWorkspace() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error || !data.user) {
    window.location.href = "index.html";
    return;
  }

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("department, role")
    .eq("user_id", data.user.id)
    .single();

  if (profileError || !profile) {
    document.getElementById("deptTitle").textContent = "No department found";
    return;
  }

  currentDepartment = profile.department;
  viewingDepartment = profile.department;
  document.getElementById("deptTitle").textContent = currentDepartment + " Workspace";

  await loadDepartmentList();
  loadFiles();
}

async function loadDepartmentList() {
  const { data, error } = await supabaseClient
    .from("departments")
    .select("Name")
    .order("Name", { ascending: true });

  const switcher = document.getElementById("deptSwitcher");
  switcher.innerHTML = "";

  if (error || !data) {
    switcher.innerHTML = "<option>Could not load departments</option>";
    return;
  }

  data.forEach((dept) => {
    const opt = document.createElement("option");
    opt.value = dept.Name;
    opt.textContent = dept.Name;
    if (dept.Name === currentDepartment) opt.selected = true;
    switcher.appendChild(opt);
  });

  switcher.addEventListener("change", () => {
    viewingDepartment = switcher.value;
    document.getElementById("deptTitle").textContent = viewingDepartment + " (viewing)";
    loadFiles();
  });
}

async function loadFiles() {
  const folder = document.getElementById("viewFolderSelect").value;
  const path = viewingDepartment + "/" + folder;

  const { data, error } = await supabaseClient.storage
    .from("documents")
    .list(path, { limit: 100 });

  const fileListEl = document.getElementById("fileList");
  fileListEl.innerHTML = "";

  if (error || !data || data.length === 0) {
    fileListEl.innerHTML = "<li>No files yet.</li>";
    return;
  }

  data.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item.name;
    fileListEl.appendChild(li);
  });
}

document.getElementById("uploadBtn").addEventListener("click", async () => {
  const fileInput = document.getElementById("fileInput");
  const folder = document.getElementById("folderSelect").value;
  const statusEl = document.getElementById("uploadStatus");

  if (!fileInput.files.length) {
    statusEl.textContent = "Please choose a file first.";
    return;
  }

  const file = fileInput.files[0];
  // Uploads always go to YOUR OWN department, regardless of what you're viewing
  const filePath = currentDepartment + "/" + folder + "/" + file.name;

  const { error } = await supabaseClient.storage
    .from("documents")
    .upload(filePath, file, { upsert: true });

  if (error) {
    statusEl.textContent = "Upload failed: " + error.message;
  } else {
    statusEl.textContent = "Upload successful!";
    if (viewingDepartment === currentDepartment) loadFiles();
  }
});

document.getElementById("viewFolderSelect").addEventListener("change", loadFiles);

loadWorkspace();