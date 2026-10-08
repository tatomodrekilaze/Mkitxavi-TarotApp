interface Props {
  className?: string;
  size?: number;
}

/** Original brand PNG. Keep this small on landing; do not blow it up. */
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
