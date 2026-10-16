import { useEffect, useState } from "react";
import { API_BASE_URL } from "../api/client";

function resolveImageUrl(value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) return value;
  return `${API_BASE_URL.replace(/\/$/, "")}/${value.replace(/^\//, "")}`;
}

export default function ProfileAvatar({ src, name, className = "", accessibleLabel }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = resolveImageUrl(src);
  useEffect(() => setFailed(false), [imageUrl]);
  const initials = (name || "Account")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "A";

  const sharedProps = accessibleLabel
    ? { role: "img", "aria-label": accessibleLabel }
    : { "aria-hidden": "true" };

  return (
    <span className={`profile-avatar ${className}`.trim()} {...sharedProps}>
      {imageUrl && !failed ? (
        <img src={imageUrl} alt="" onError={() => setFailed(true)} />
      ) : (
        <span className="profile-avatar-initials">{initials}</span>
      )}
    </span>
  );
}
