import Image from "next/image";

type AppLogoProps = {
  size?: number;
  className?: string;
};

export function AppLogo({ size = 40, className }: AppLogoProps) {
  return (
    <Image
      src="/neon-logo.png"
      alt="Neon"
      width={size}
      height={size}
      priority
      className={`shrink-0 rounded-lg ${className ?? ""}`}
    />
  );
}
