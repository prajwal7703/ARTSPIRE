import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function ArtistLogin() {
  const [email, setEmail] = useState("appu@gamil.com"); // Notice the typo in 'gamil' from your logs!
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    // CRITICAL: Prevents the page from refreshing on form submit
    e.preventDefault(); 

    try {
      // Sending exact expected keys to the backend
      const res = await axios.post(
        "https://artspire-backend-qv5b.onrender.com/api/auth/login", 
        { email, password }
      );
      
      console.log("Login Successful! 🎉", res.data);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("artist", JSON.stringify(res.data.artist || res.data.user));
      navigate("/artist-dashboard");
    } catch (error) {
      // CRITICAL: This will log the EXACT reason your backend returns a 400 error!
      console.error("Backend Rejected Login Error:", error.response?.data);
      alert(error.response?.data?.message || "Login failed with status 400");
    }
  };

  return (
    <div style={s.container}>
      <h2>Artist Login</h2>
      
      {/* FIX: Form element wraps the inputs for correct submission */}
      <form onSubmit={handleLogin} style={s.form}>
        
        {/* FIX: Added autoComplete="username" */}
        <input 
          type="email" 
          name="email" 
          placeholder="Email" 
          required 
          value={email} 
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          style={s.input}
        />

        {/* FIX: Password input is now inside a <form> and has autoComplete */}
        <input 
          type="password" 
          name="password" 
          placeholder="Min. 6 characters" 
          required
          value={password} 
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          style={s.input}
        />

        {/* FIX: Button is type="submit" to trigger form submission */}
        <button type="submit" style={s.button}>Login</button>
      </form>
    </div>
  );
}

const s = {
  container: { padding: "40px", maxWidth: "400px", margin: "0 auto", fontFamily: "Nunito, sans-serif" },
  form: { display: "flex", flexDirection: "column", gap: "16px" },
  input: { padding: "16px", borderRadius: "50px", border: "1px solid #d1d5db", outline: "none", fontSize: "16px" },
  button: { padding: "14px", borderRadius: "50px", background: "#1e3a8a", color: "#fff", border: "none", cursor: "pointer", fontWeight: "bold" }
};