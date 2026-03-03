import gsap from "gsap";

export const createBlurAnimation = (
  selector1: string,
  selector2: string
) => {
  const set1X = gsap.quickTo(selector1, "x", {ease: "power3.out"});
  const set1Filter = gsap.quickTo(selector1, "blur", {ease: "power3.out"});

  const set2X = gsap.quickTo(selector2, "x", {ease: "power3.out"});
  const set2Filter = gsap.quickTo(selector2, "blur", {ease: "power3.out"});

  return (progress: number) => {

    console.log({progress})
    if (progress > 0.1 && progress < 0.98) {
      set1X(400 * progress);
    //   set1Filter(`blur(${120 - progress * 100}px)`);
    set1Filter(120 - progress * 100)

      set2X(-400 * progress);
      set2Filter(120 - progress * 100);
    } else if (progress > 0.7) {
      set1X(-2 * progress);
      set1Filter(120 - progress * -10);

      set2X(-40 * progress);
      set2Filter(120 - progress * -10);
    }
  };
};