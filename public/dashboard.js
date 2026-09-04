async function loadUser() {
  const user = await requireAuth();
  if (!user) return;

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("department, role")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    document.getElementById("userEmail").textContent =
      "Logged in as: " + user.email + " (no profile found)";
    return;
  }

  document.getElementById("userEmail").textContent =
    "Welcome, " + profile.department + " (" + profile.role + ")";

  if (profile.role === "executive") {
    document.getElementById("adminLink").style.display = "";
  }
}

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  window.location.href = "home.html";
});

loadUser();