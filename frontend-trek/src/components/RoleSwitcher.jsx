import React from "react";

export default function RoleSwitcher() {
  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : null;

  if (!currentUser) return null;

  const role = (currentUser.role || "").toLowerCase();
  const baseRole = (currentUser.baseRole || role).toLowerCase();
  const email = (currentUser.email || "").toLowerCase();

  // Cek apakah akun dasarnya adalah Super Admin
  const isSuperAdmin =
    baseRole === "superadmin" ||
    role === "superadmin" ||
    currentUser.role_id === 1 ||
    email.startsWith("superadmin");

  const formatRole = (r) => {
    if (!r) return "-";
    if (r === "superadmin") return "Superadmin";
    if (r === "admin") return "Admin";
    if (r === "user") return "User";
    return r.charAt(0).toUpperCase() + r.slice(1);
  };

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    const updatedUser = {
      ...currentUser,
      role: newRole,
      baseRole: baseRole,
    };
    localStorage.setItem("user", JSON.stringify(updatedUser));

    if (newRole === "superadmin") {
      window.location.href = "/dashboardsuperadmin";
    } else if (newRole === "admin") {
      window.location.href = "/dashboardadmin";
    } else {
      window.location.href = "/dashboarduser";
    }
  };

  // Jika bukan Super Admin, tampilkan pill statis biasa
  if (!isSuperAdmin) {
    return <span className="role-pill">{formatRole(role)}</span>;
  }

  // Jika Super Admin, tampilkan dropdown pill interaktif
  return (
    <select
      className="role-select-pill"
      value={role}
      onChange={handleRoleChange}
      title="Klik untuk mengubah role aktif Anda"
    >
      <option value="superadmin">Superadmin</option>
      <option value="admin">Admin</option>
      <option value="user">User</option>
    </select>
  );
}
