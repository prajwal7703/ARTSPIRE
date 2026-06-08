import { Navigate } from "react-router-dom";

export default function ProtectedRoute({

  children,
  role,

}) {

  // GET USER

  const user =
  JSON.parse(
    localStorage.getItem("user")
  );


  // IF NOT LOGGED IN

  if (!user) {

    return <Navigate to="/login" />;

  }


  // ROLE PROTECTION

  if (

    role &&

    user.role !== role

  ) {

    return <Navigate to="/" />;

  }


  return children;

}
