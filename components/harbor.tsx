import { Star } from "lucide-react";
import Duck from "./duck";

export function HarborRiver({ small = false }: { small?: boolean }) {
  return <div className={`harbor-river ${small ? "harbor-river-small" : ""}`} aria-hidden="true"><div className="harbor-current current-one" /><div className="harbor-current current-two" /><span className="harbor-course" /><span className="harbor-buoy buoy-one"><Star size={22} fill="currentColor" /></span><span className="harbor-buoy buoy-two"><Star size={14} /></span><span className="harbor-duck duck-one"><Duck skin="star" /></span><span className="harbor-duck duck-two"><Duck skin="captain" /></span><span className="harbor-duck duck-three"><Duck skin="rose" /></span>{!small && <span className="harbor-river-caption">STAR RIVER CLUB · CÙNG NHAU VỀ ĐÍCH</span>}</div>;
}

export default function HomeHarbor() {
  return <section className="home-intro home-harbor"><div className="harbor-copy"><span className="club-eyebrow"><Star size={13} fill="currentColor" /> STAR RIVER CLUB</span><h1>Hẹn nhau ở<br />vạch xuất phát.</h1><p>Chọn một chú vịt. Nhập hội cùng bạn bè.<br />Phần bất ngờ, để dòng sông lo.</p><div className="harbor-meta"><span>200 người cùng chơi</span><span>12 kiểu vịt</span></div></div><HarborRiver /></section>;
}
