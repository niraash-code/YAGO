import { LucideIcon, LucideProps } from "lucide-react";
import { cn } from "../../lib/utils";

interface IconProps extends LucideProps {
  icon: LucideIcon;
}

export const Icon = ({
  icon: IconComponent,
  className,
  size = 18,
  ...props
}: IconProps) => {
  return (
    <IconComponent
      size={size}
      className={cn("stroke-[1.5]", className)} // Enforce consistent stroke width
      {...props}
    />
  );
};
