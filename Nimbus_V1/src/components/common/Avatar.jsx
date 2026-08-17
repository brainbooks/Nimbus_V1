import { Icon } from "@iconify/react";

const Avatar = ({ src, name = "", size = "md", className = "" }) => {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-base",
  };

  // Generate initials from the name
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`relative rounded-full overflow-hidden shrink-0 ${sizeClasses[size] || sizeClasses.md} ${className}`}
    >
      {src ? (
        <img
          src={src}
          alt={name || "User avatar"}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = "none";
            e.target.nextSibling.style.display = "flex";
          }}
        />
      ) : null}
      <div
        className="absolute inset-0 bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white select-none"
        style={{ display: src ? "none" : "flex" }}
      >
        {initials || <Icon icon="lucide:user" className="w-1/2 h-1/2" />}
      </div>
    </div>
  );
};

export default Avatar;
