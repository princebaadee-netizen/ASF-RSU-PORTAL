const SUPABASE_URL = "https://buywrhouqomubszwfqck.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_8GvFU7sm8pt1N9s8Ingrjg_4074Fzdm";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let currentDepartment = "";

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
  document.getElementById("deptTitle").textContent = currentDepartment + " Workspace";

  loadFiles();
}

async function loadFiles() {
  const { data, error } = await supabaseClient.storage
    .from("documents")
    .list(currentDepartment, { limit: 100 });

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
  const filePath = currentDepartment + "/" + folder + "/" + file.name;

  const { error } = await supabaseClient.storage
    .from("documents")
    .upload(filePath, file, { upsert: true });

  if (error) {
    statusEl.textContent = "Upload failed: " + error.message;
  } else {
    statusEl.textContent = "Upload successful!";
    loadFiles();
  }
});

loadWorkspace();