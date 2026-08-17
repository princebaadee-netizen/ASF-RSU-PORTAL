const SUPABASE_URL = "https://buywrhouqomubszwfqck.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_8GvFU7sm8pt1N9s8Ingrjg_4074Fzdm";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function loadUser() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error || !data.user) {
    window.location.href = "index.html";
    return;
  }

  // Fetch this user's profile (department + role)
  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("department, role")
    .eq("user_id", data.user.id)
    .single();

  if (profileError || !profile) {
    document.getElementById("userEmail").textContent =
      "Logged in as: " + data.user.email + " (no profile found)";
    return;
  }

  document.getElementById("userEmail").textContent =
    "Welcome, " + profile.department + " (" + profile.role + ")";
}

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
});

loadUser();