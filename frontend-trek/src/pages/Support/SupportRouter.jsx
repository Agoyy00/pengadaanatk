import { useEffect, useState } from "react";
import Support from "./Support";
import UserSupport from "../User/UserSupport";

const normalizeRole = (role) =>
  String(role || "")
    .toLowerCase()
    .replace(/[\s_]+/g, "");

export default function SupportRouter() {
  const [role, setRole] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setRole(normalizeRole(user.role));
      } catch {}
    }
  }, []);

  if (role === "user") {
    return <UserSupport />;
  }

  return <Support />;
}
