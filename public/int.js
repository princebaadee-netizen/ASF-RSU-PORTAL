document.getElementById("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const loginButton = document.getElementById("loginBtn");
    const errorMessage = document.getElementById("errorMsg");

    if (!email || !password) {
        errorMessage.textContent = "Enter your email and password.";
        return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";
    errorMessage.textContent = "";

    try {
        const { error } = await supabaseClient.auth.signInWithPassword({ email,
            password,
        });

        if (error) {
            errorMessage.textContent = error.message;
        } else {
            window.location.href = "dashboard.html";
        }
    } catch (error) {
        errorMessage.textContent = "Unable to log in right now. Please try again.";
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Log in";
    }
});

document.getElementById("showPassword").addEventListener("change", function () {
  const passwordField = document.getElementById("password");
  passwordField.type = this.checked ? "text" : "password";
});