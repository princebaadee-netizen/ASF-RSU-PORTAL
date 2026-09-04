const requestForm = document.getElementById("requestForm");
const newPasswordForm = document.getElementById("newPasswordForm");
const requestMsg = document.getElementById("requestMsg");
const updateMsg = document.getElementById("updateMsg");

async function detectRecoverySession() {
  const hash = window.location.hash;
  if (!hash || !hash.includes("access_token")) return;

  const params = new URLSearchParams(hash.substring(1));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (!accessToken || !refreshToken) return;

  const { error } = await supabaseClient.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    requestMsg.textContent = "Invalid or expired reset link. Please request a new one.";
    requestMsg.style.color = "var(--danger)";
    requestForm.style.display = "";
    newPasswordForm.style.display = "none";
    window.history.replaceState(null, "", window.location.pathname);
    return;
  }

  window.history.replaceState(null, "", window.location.pathname);
  requestForm.style.display = "none";
  newPasswordForm.style.display = "";
}

requestForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("resetEmail").value.trim();
  const btn = document.getElementById("requestBtn");

  if (!email) {
    requestMsg.textContent = "Enter your email address.";
    requestMsg.style.color = "var(--danger)";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Sending...";
  requestMsg.textContent = "";

  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/reset-password.html",
  });

  btn.disabled = false;
  btn.textContent = "Send reset link";

  if (error) {
    requestMsg.textContent = error.message;
    requestMsg.style.color = "var(--danger)";
  } else {
    requestMsg.textContent = "Check your email for a password reset link.";
    requestMsg.style.color = "var(--green-mid)";
  }
});

newPasswordForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const password = document.getElementById("newPassword").value;
  const confirm = document.getElementById("confirmPassword").value;
  const btn = document.getElementById("updateBtn");

  if (!password || !confirm) {
    updateMsg.textContent = "Enter and confirm your new password.";
    updateMsg.style.color = "var(--danger)";
    return;
  }

  if (password !== confirm) {
    updateMsg.textContent = "Passwords do not match.";
    updateMsg.style.color = "var(--danger)";
    return;
  }

  if (password.length < 6) {
    updateMsg.textContent = "Password must be at least 6 characters.";
    updateMsg.style.color = "var(--danger)";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Updating...";
  updateMsg.textContent = "";

  const { error } = await supabaseClient.auth.updateUser({ password });

  btn.disabled = false;
  btn.textContent = "Update password";

  if (error) {
    updateMsg.textContent = error.message;
    updateMsg.style.color = "var(--danger)";
  } else {
    newPasswordForm.style.display = "none";
    requestForm.style.display = "";
    requestForm.querySelector("h1").textContent = "Password updated";
    requestForm.querySelector("p").textContent = "Your password has been changed. You can now log in with your new password.";
    requestForm.querySelector("input").style.display = "none";
    requestForm.querySelector("button").style.display = "none";
    requestMsg.textContent = "";
  }
});

detectRecoverySession();
