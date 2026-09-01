const SUPABASE_URL = "https://buywrhouqomubszwfqck.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_8GvFU7sm8pt1N9s8Ingrjg_4074Fzdm";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

console.log("Supabase connected:", supabaseClient);

document.getElementById("loginBtn")
.addEventListener("click", async() => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email: email,
        password: password,
    });

    if(error) {
        document.getElementById("errorMsg").textContent = error.message;
    } else{
        document.getElementById("errorMsg").textContent = "";
        window.location.href = "dashboard.html";
    }
});

document.getElementById("showPassword").addEventListener("change", function () {
  const passwordField = document.getElementById("password");
  passwordField.type = this.checked ? "text" : "password";
});