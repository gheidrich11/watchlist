import { ChevronDownIcon } from "./icons";

function AccordionHeader({
  open,
  onToggle,
  label,
  count,
}: {
  open: boolean;
  onToggle: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-3 w-full py-3 text-left group cursor-pointer"
    >
      <div className="h-px flex-1 bg-zinc-800/80" />
      <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest whitespace-nowrap group-hover:text-zinc-400 transition-colors duration-150">
        {label}
      </span>
      <span className="text-[11px] text-zinc-700 group-hover:text-zinc-500 transition-colors duration-150">
        ({count})
      </span>
      <div className="h-px flex-1 bg-zinc-800/80" />
      <ChevronDownIcon
        open={open}
        className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 flex-shrink-0 transition-colors duration-150"
      />
    </button>
  );
}

export default AccordionHeader;
