import { Icon } from "@iconify/react";

const IconButton = ({
  icon,
  onClick,
  tooltip = "",
  size = "md",
  variant = "ghost",
  className = "",
  ...props
}) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const variantClasses = {
    ghost:
      "bg-transparent hover:bg-white/8 active:bg-white/12 text-zinc-400 hover:text-white",
    filled:
      "bg-white/6 hover:bg-white/10 active:bg-white/14 text-zinc-300 hover:text-white border border-white/6",
    danger:
      "bg-transparent hover:bg-red-500/15 active:bg-red-500/25 text-zinc-400 hover:text-red-400",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip}
      className={`
        inline-flex items-center justify-center rounded-xl
        transition-all duration-200 cursor-pointer select-none
        ${sizeClasses[size] || sizeClasses.md}
        ${variantClasses[variant] || variantClasses.ghost}
        ${className}
      `}
      {...props}
    >
      <Icon icon={icon} className={iconSizes[size] || iconSizes.md} />
    </button>
  );
};

export default IconButton;
