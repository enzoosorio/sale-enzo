interface MobileMenuButtonProps {
  onClick: () => void;
}

export const MobileMenuButton = ({ onClick }: MobileMenuButtonProps) => {
  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-1.5 w-6 h-6 justify-center items-center md:hidden"
      aria-label="Abrir menú"
    >
      <span className="w-full h-0.5 bg-foreground transition-all"></span>
      <span className="w-full h-0.5 bg-foreground transition-all"></span>
      <span className="w-full h-0.5 bg-foreground transition-all"></span>
    </button>
  );
};
