import { useState } from "react";
import axios from "axios";

export default function ArtistLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    // 1. This prevents the browser from reloading the entire page
    e.preventDefault(); 
    
    console.log("Submitting payload:", { email, password });

    try {
      const res = await axios.post("https://artspire-backend-qv5b.onrender.com/api/auth/login", {
        email,
        password
      });
      console.log("Success!", res.data);
      // Save token, redirect user, etc.
    } catch (error) {
      // 2. Check your browser console after a failed login to read this!
      console.error("Backend response error:", error.response?.data);
    }
  };

  // The return statement MUST live inside the ArtistLogin function wrapper!
  return (
    <div style={{ padding: 40, maxWidth: 400, margin: "0 auto" }}>
      <h2>Artist Login</h2>
      
      {/* Wrap everything in a proper form tag to clear DOM warnings */}
      <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        
        <input 
          type="email" 
          name="email" 
          placeholder="you@example.com" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username" 
          required 
          style={s.input}
        />

        <input 
          type="password" 
          name="password" 
          placeholder="Min. 6 characters" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password" 
          required 
          style={s.input}
        />

        {/* Setting type="submit" fires the onSubmit form event */}
        <button type="submit" style={s.btn}>Login</button>
      </form>
    </div>
  );
}

const s = {
  input: { padding: "13px 16px", borderRadius: 12, border: "1.5px solid #e2e8f0" },
  btn: { padding: "12px", background: "#1e3a8a", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer" }
};