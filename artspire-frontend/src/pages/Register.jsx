import { Link } from 'react-router-dom';

export default function Register() {
  return (
    <div style={{ padding: '100px 24px', textAlign: 'center' }}>
      <h1>Create Account</h1>
      <p>Already have an account? <Link to='/login'>Login</Link></p>
    </div>
  );
}
