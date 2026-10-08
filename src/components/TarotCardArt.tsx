import type { TarotCard } from "@/lib/tarot";

interface Props {
  card: TarotCard;
  className?: string;
  alt?: string;
}

/** Public-domain Rider–Waite–Smith scan (Pamela Colman Smith, 1909). */
export function TarotCardArt({ card, className = "", alt }: Props) {
  return (
    <img
      src={card.image}
      alt={alt ?? card.names.en}
      className={`block object-cover ${className}`}
      draggable={false}
      loading="lazy"
    />
  );
}
