import type { LucideIcon } from "lucide-react";
import estadioFondo from "@/assets/Estadiofutbolfondo.png";

type SectionHeroProps = {
  title: string;
  subtitle: string;
  eyebrow?: string;
  icon?: LucideIcon;
  image?: string;
  children?: React.ReactNode;
};

export function SectionHero({ title, subtitle, eyebrow, icon: Icon, image = estadioFondo, children }: SectionHeroProps) {
  return (
    <section className="relative isolate min-h-[132px] overflow-hidden rounded-2xl border border-white/15 bg-black px-4 py-5 text-white shadow-soft sm:min-h-[184px] sm:rounded-[1.75rem] sm:px-8 sm:py-8">
      <img src={image} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover object-center opacity-45" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black via-black/85 to-black/45" />
      <div className="absolute -right-10 -top-16 -z-10 h-44 w-44 rounded-full border-[28px] border-gold/15 sm:h-56 sm:w-56 sm:border-[36px]" />
      <div className="relative flex h-full max-w-2xl flex-col justify-center">
        {eyebrow && <p className="mb-1.5 flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.28em] text-gold sm:text-[10px]">{Icon && <Icon className="h-3 w-3" />}{eyebrow}</p>}
        <h1 className="display text-[1.75rem] leading-none tracking-[0.04em] sm:text-5xl">{title}</h1>
        <p className="mt-2 max-w-xl text-[11px] leading-relaxed text-white/70 sm:mt-3 sm:text-sm">{subtitle}</p>
        {children}
      </div>
    </section>
  );
}
