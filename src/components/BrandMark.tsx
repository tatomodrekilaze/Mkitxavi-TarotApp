interface Props {
  className?: string;
  size?: number;
}

/** Use the original logo at a size that keeps it sharp. */
export function BrandMark({ className, size = 36 }: Props) {
  return (
    <img
      src="/brand-icon.png"
      alt=""
      width={size}
      height={size}
      className={className ?? "object-contain"}
    />
  );
}
