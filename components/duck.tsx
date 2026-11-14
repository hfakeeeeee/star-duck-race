import { SKINS, type SkinId } from "../lib/race";
export default function Duck({ skin = "sunny", color, className = "", ...props }: { skin?: SkinId; color?: string; className?: string; style?: React.CSSProperties }) {
  const preset = SKINS.find(s => s.id === skin) || SKINS[0]; const fill = color || preset.color;
  return <svg viewBox="0 0 100 100" fill="none" className={`duck ${className}`} aria-hidden="true" {...props}>
    <ellipse cx="45" cy="89" rx="38" ry="5" fill="#172b63" fillOpacity=".08" />
    <path d="M13 58c-8 0-10-8-11-12 9 6 17 2 22 1h40c23 0 30 15 20 30-8 13-27 16-45 11C22 83 13 71 13 58Z" fill={fill} />
    <circle cx="64" cy="41" r="25" fill={fill} /><path d="m85 42 15 7-16 7" fill="#ec8945" />
    <path d="M28 59c9-7 23-4 28 3-5 12-22 13-28-3Z" fill="#172b63" fillOpacity=".12" />
    <circle cx="72" cy="35" r="3.5" fill="#172b63" /><circle cx="73" cy="34" r="1" fill="white" />
    {preset.hat === "crown" && <path d="m43 20-3-15 12 8L62 0l8 13L84 6l-4 16Z" fill="#d2aa61" stroke="#a57d35" strokeWidth="2" />}
    {preset.hat === "captain" && <><path d="M40 22V10c0-11 45-11 45 0v12Z" fill="white" stroke="#172b63" strokeWidth="2" /><path d="M46 20h44v7H46Z" fill="#172b63" /><path d="m65 6 3 5-3 5-3-5Z" fill="#d2aa61" /></>}
    {preset.hat === "bow" && <><path d="M60 17C40-2 37 24 59 22c23 11 33-16 6-6Z" fill="#d4568c" /><circle cx="62" cy="19" r="5" fill="#a53069" /></>}
    {preset.hat === "cap" && <><path d="M42 22a22 18 0 0 1 44 0Z" fill="#172b63" /><path d="M61 20h34v6H61Z" fill="#243f82" /></>}
    {preset.hat === "flower" && <><path d="M51 11c-10-18-23 2-10 8-17 9 5 23 13 10 9 15 27-4 12-12 15-13-6-23-15-6Z" fill="#d486b8" /><circle cx="53" cy="19" r="6" fill="#f5ce53" /></>}
    {preset.hat === "ninja" && <><path d="M41 28h45v14H41Z" fill="#172b63" /><path d="m42 30-15-5 4 8-10 4 21 3Z" fill="#172b63" /><circle cx="72" cy="35" r="3" fill="white" /></>}
    {preset.hat === "tiger" && <><path d="m40 20-10-11 2 20m38-9 9-11 4 18" fill="#ed9950" /><path d="m54 20 4 9 5-10M21 57l13 7-11 5m17 5 12-5-9-7" fill="#172b63" /></>}
    {preset.hat === "scarf" && <path d="M43 55c14 5 23 5 37-1l-2 9-17 1-8 17-11-6 10-12-11-2Z" fill="#d56367" />}
    {preset.hat === "party" && <><path d="m43 21 17-21 21 23Z" fill="#d4568c" /><circle cx="60" cy="3" r="4" fill="#f5ce53" /><circle cx="61" cy="15" r="3" fill="#f5ce53" /></>}
    {preset.hat === "explorer" && <><path d="M41 20 45 5h29l7 16Z" fill="#aa8d58" /><path d="M32 20h59v7H32Z" fill="#8c7046" /></>}
  </svg>;
}
