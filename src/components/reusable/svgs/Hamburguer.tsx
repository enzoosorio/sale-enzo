export const Hamburguer = ({ className }: { className?: string }) => {
  return (
    <svg
  viewBox="0 0 15 12"
  fill="none"
  className={`${className} transition-transform duration-300 ease-in-out w-6 fill-black/50 stroke-black/60`}
>
  <g id="hamburguer-2">
    <g id="Frame 87">
      <circle id="Ellipse 15" cx="1" cy="1" r="1" stroke="none" />
      <path id="Vector 22" d="M3 1H15" strokeWidth="0.5" />
    </g>
    <g id="Frame 88">
      <circle id="Ellipse 15_2" cx="1" cy="6" r="1" stroke="none"    />
      <path id="Vector 22_2" d="M3 6H15" strokeWidth="0.5" />
    </g>
    <g id="Frame 89">
      <circle id="Ellipse 15_3" cx="1" cy="11" r="1" stroke="none" />
      <path id="Vector 22_3" d="M3 11H15" strokeWidth="0.5" />
    </g>
  </g>
</svg>
  );
};

