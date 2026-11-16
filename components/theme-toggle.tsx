"use client";
import { useEffect, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";

export default function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme(), [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return <DropdownMenu><DropdownMenuTrigger asChild><button className="icon-btn theme-toggle" aria-label="Giao diện" title="Giao diện" data-sound="silent">{mounted && resolvedTheme === "dark" ? <Moon size={17} /> : <Sun size={17} />}</button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="theme-menu"><DropdownMenuLabel>Giao diện</DropdownMenuLabel><DropdownMenuSeparator />{([{ id: "light", label: "Sáng", Icon: Sun }, { id: "dark", label: "Tối", Icon: Moon }, { id: "system", label: "Hệ thống", Icon: Monitor }]).map(({ id, label, Icon }) => <DropdownMenuItem key={id} role="menuitemradio" aria-checked={mounted && theme === id} onSelect={() => setTheme(id)}><Icon size={16} /><span>{label}</span>{mounted && theme === id && <Check size={15} className="theme-check" />}</DropdownMenuItem>)}</DropdownMenuContent>
  </DropdownMenu>;
}
