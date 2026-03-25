"use client";
import { useGSAP } from "@gsap/react";
import { Mic, SendHorizontal, Sparkles } from "lucide-react";
import gsap from "gsap";
import {
  FormEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";

gsap.registerPlugin(useGSAP, MorphSVGPlugin);

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatModalProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  setFirstAnimationStarting: (show: boolean) => void;
  title?: string;
  subtitle?: string;
  suggestions?: string[];
};

const DEFAULT_SUGGESTIONS = [
  "Help me find an outfit",
  "Show me something casual",
  "What matches with black pants?",
];

const MOCK_ASSISTANT_REPLIES = [
  "Great choice. I can suggest a balanced look with one statement piece and clean basics.",
  "I can do that. Tell me your preferred fit and I will suggest options by style.",
  "Nice prompt. Try a light top, structured layer, and neutral shoes for contrast.",
  "I can curate a few combinations with different vibes: minimal, street, and smart casual.",
];

const generateId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const ChatModal = ({
  isOpen,
  setIsOpen,
  title = "Syllie",
  setFirstAnimationStarting,
  subtitle = "Style Assistant",
  suggestions = DEFAULT_SUGGESTIONS,
}: ChatModalProps) => {
  const [view, setView] = useState<"chat" | "info">("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const svgFaceRef = useRef<SVGSVGElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingTimeoutsRef = useRef<number[]>([]);
  const entranceTlRef = useRef<gsap.core.Timeline | null>(null);

  useGSAP(() => {
    if (!modalRef.current) return;

    if (view === "info") {
      gsap.to("#icon-main", {
        morphSVG: "#icon-alt",
        duration: 0.4,
        ease: "power2.inOut",
      });
    } else {
      gsap.to("#icon-main", {
        morphSVG: {
          shape: "#icon-main",
        },
        duration: 0.4,
        ease: "power2.inOut",
      });
    }
  }, [view]);

  useGSAP(() => {

    if (!isOpen || !svgFaceRef.current) return;

    entranceTlRef.current = gsap.timeline({
      paused: true,
    });

    entranceTlRef.current.fromTo('.syllie-wrapper-inside-modal',
      { x: -100 },
      {
        x: 0,
        duration: 1.5,
        ease: "elastic.out(1.5,1)",
      }
    );
    entranceTlRef.current.play();

  }, [isOpen]);

  const { contextSafe } = useGSAP();

  const onClose = contextSafe(() => {
    if (entranceTlRef.current) {
      entranceTlRef.current.reverse().then(() => {
        setIsOpen(false);
        setFirstAnimationStarting(false);
      });
    } else {
      // Fallback por si algo falla
      setIsOpen(false);
      setFirstAnimationStarting(false);
    }
  });

  const clearPendingReplies = useCallback(() => {
    pendingTimeoutsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    pendingTimeoutsRef.current = [];
  }, []);

  const pushMockAssistantReply = useCallback(() => {
    const timeoutId = window.setTimeout(() => {
      const randomReply =
        MOCK_ASSISTANT_REPLIES[
        Math.floor(Math.random() * MOCK_ASSISTANT_REPLIES.length)
        ];

      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: generateId(),
          role: "assistant",
          content: randomReply,
        },
      ]);
    }, 800);

    pendingTimeoutsRef.current.push(timeoutId);
  }, []);

  const sendMessage = useCallback(
    (rawContent: string) => {
      const content = rawContent.trim();
      if (!content) {
        return;
      }

      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: generateId(),
          role: "user",
          content,
        },
      ]);
      setInputValue("");
      pushMockAssistantReply();
    },
    [pushMockAssistantReply],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage(inputValue);
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const handleOverlayMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !modalRef.current) {
        return;
      }

      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      if (focusableElements.length === 0) {
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      clearPendingReplies();
    };
  }, [clearPendingReplies]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-120 flex items-center justify-center bg-neutral-950/50 p-4 backdrop-blur-md animate-in fade-in duration-300"
      onMouseDown={handleOverlayMouseDown}
      aria-hidden="true"
    >
      <section
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Syllie assistant chat"
        className="relative flex h-[min(82vh,46rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/55 bg-white/55 shadow-[0_20px_60px_rgba(12,20,29,0.32)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-300"
      >
        <div className="pointer-events-none absolute inset-0">
          <img
            src="/images/fondo-marmol.avif"
            alt=""
            className="object-cover w-full h-full opacity-90"
          />
          <div className="absolute inset-0 bg-linear-to-b from-white/95 via-white/45 to-white/50" />
        </div>

        <header className="inner-shadow-for-header bg-white relative z-10 my-5 flex items-center justify-between border-b border-black/10 px-10 py-4">
          <div className="flex items-center gap-4 ">
            <div className="sillye-chat-position flex w-14">
              {/* syllie face */}
              <svg className="syllie-wrapper-inside-modal w-full h-auto"
              ref={svgFaceRef}
                viewBox="0 0 666 436"
                fill="none">
                <g id="syllie-3d-idle">
                  <g id="face" filter="url(#filter0_dii_719_2185)">
                    <path d="M28.4593 158.527C13.3039 190.039 2.02492 210.009 0.665273 245.732C-0.665044 280.684 6.03543 311.818 20.7739 333.003C42.0425 363.575 58.2829 375.227 88.786 393.422C126.172 415.721 152.333 418.684 195.05 426.987C249.075 437.489 335.811 433.7 335.811 433.7C335.811 433.7 430.874 434.058 489.978 421.647C527.788 413.708 552.164 414.122 584.801 393.422C617.461 372.708 635.062 352.813 650.848 319.577C663.419 293.108 665.298 275.024 664.254 245.732C662.984 210.121 652.376 189.597 637.442 158.527C623.872 130.294 610.902 108.604 584.801 84.6825C557.719 59.8613 531.767 37.7149 489.978 24.2639C427.931 4.29204 395.685 -0.21667 334.971 0.587262C279.823 1.31749 247.335 5.52443 195.05 24.2639C150.121 40.367 124.543 53.0331 88.786 84.6825C60.909 109.358 44.6043 124.958 28.4593 158.527Z" fill="url(#paint0_radial_719_2185)" />
                    <path d="M28.4593 158.527C13.3039 190.039 2.02492 210.009 0.665273 245.732C-0.665044 280.684 6.03543 311.818 20.7739 333.003C42.0425 363.575 58.2829 375.227 88.786 393.422C126.172 415.721 152.333 418.684 195.05 426.987C249.075 437.489 335.811 433.7 335.811 433.7C335.811 433.7 430.874 434.058 489.978 421.647C527.788 413.708 552.164 414.122 584.801 393.422C617.461 372.708 635.062 352.813 650.848 319.577C663.419 293.108 665.298 275.024 664.254 245.732C662.984 210.121 652.376 189.597 637.442 158.527C623.872 130.294 610.902 108.604 584.801 84.6825C557.719 59.8613 531.767 37.7149 489.978 24.2639C427.931 4.29204 395.685 -0.21667 334.971 0.587262C279.823 1.31749 247.335 5.52443 195.05 24.2639C150.121 40.367 124.543 53.0331 88.786 84.6825C60.909 109.358 44.6043 124.958 28.4593 158.527Z" fill="url(#paint1_radial_719_2185)" />
                  </g>
                  <g id="left-eye">
                    <path d="M192.862 140.231C180.028 137.661 176.534 136.381 163.777 139.312C141.829 144.353 128.108 153.343 116.856 172.877C106.311 191.186 107.793 206.61 112.428 227.503C116.211 244.555 122.346 253.283 132.333 267.492L132.537 267.782C148.554 290.57 166.155 310.549 186.16 314.774C201.739 318.064 211.199 319.594 226.377 314.774C243.116 309.458 258.309 298.647 269.764 285.319C282.197 270.853 283.865 258.739 283.17 238.326C282.607 221.755 278.512 215.779 269.764 198.047C262.34 182.997 255.933 175.102 242.953 164.482C229.354 153.356 210.081 143.68 192.862 140.231Z" fill="url(#paint2_radial_719_2185)" />
                    <path d="M192.862 140.231C180.028 137.661 176.534 136.381 163.777 139.312C141.829 144.353 128.108 153.343 116.856 172.877C106.311 191.186 107.793 206.61 112.428 227.503C116.211 244.555 122.346 253.283 132.333 267.492L132.537 267.782C148.554 290.57 166.155 310.549 186.16 314.774C201.739 318.064 211.199 319.594 226.377 314.774C243.116 309.458 258.309 298.647 269.764 285.319C282.197 270.853 283.865 258.739 283.17 238.326C282.607 221.755 278.512 215.779 269.764 198.047C262.34 182.997 255.933 175.102 242.953 164.482C229.354 153.356 210.081 143.68 192.862 140.231Z" fill="url(#paint3_radial_719_2185)" />
                  </g>
                  <path id="right-eye" d="M467.383 140.15C480.208 137.66 483.7 136.421 496.447 139.259C518.378 144.142 532.088 152.848 543.332 171.768C553.869 189.501 552.388 204.439 547.756 224.675C543.976 241.19 537.846 249.643 527.867 263.405L527.663 263.686C511.658 285.758 494.07 305.108 474.081 309.2C458.513 312.387 449.061 313.868 433.894 309.2C417.169 304.052 401.987 293.581 390.54 280.671C378.118 266.661 376.451 254.928 377.145 235.158C377.708 219.108 381.799 213.32 390.54 196.146C397.959 181.57 404.361 173.923 417.331 163.637C430.92 152.861 450.178 143.49 467.383 140.15Z" fill="url(#paint4_radial_719_2185)" />
                </g>
                <defs>
                  <filter id="filter0_dii_719_2185" x="0" y="-3.5" width="666" height="439.366" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                    <feOffset dx="0.5" dy="0.5" />
                    <feGaussianBlur stdDeviation="0.5" />
                    <feComposite in2="hardAlpha" operator="out" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_719_2185" />
                    <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_719_2185" result="shape" />
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                    <feOffset dx="1" dy="1" />
                    <feGaussianBlur stdDeviation="2" />
                    <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
                    <feBlend mode="normal" in2="shape" result="effect2_innerShadow_719_2185" />
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                    <feOffset dx="1" dy="-4" />
                    <feGaussianBlur stdDeviation="2" />
                    <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0.696154 0 0 0 0 0.696154 0 0 0 0 0.696154 0 0 0 0.25 0" />
                    <feBlend mode="normal" in2="effect2_innerShadow_719_2185" result="effect3_innerShadow_719_2185" />
                  </filter>
                  <radialGradient id="paint0_radial_719_2185" cx="0" cy="0" r="1" gradientTransform="matrix(268.688 510.037 -290.304 152.743 123.108 -29.9779)" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#A1A19A" stopOpacity="0.5" />
                    <stop offset="0.567385" stopColor="#676766" />
                    <stop offset="1" stopColor="#373732" />
                  </radialGradient>
                  <radialGradient id="paint1_radial_719_2185" cx="0" cy="0" r="1" gradientTransform="matrix(404.577 187.713 -288.983 625.078 62.5763 179.039)" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#A1A19A" />
                    <stop offset="0.506669" stopColor="#393934" stopOpacity="0.5" />
                    <stop offset="1" stopColor="#21211D" stopOpacity="0.5" />
                  </radialGradient>
                  <radialGradient id="paint2_radial_719_2185" cx="0" cy="0" r="1" gradientTransform="matrix(-194.384 -127.55 234.712 -358.793 288.891 298.745)" gradientUnits="userSpaceOnUse">
                    <stop offset="0.122263" stopColor="#236A96" />
                    <stop offset="0.853424" stopColor="#A8C1D1" />
                  </radialGradient>
                  <radialGradient id="paint3_radial_719_2185" cx="0" cy="0" r="1" gradientTransform="matrix(-67.0291 -100.697 185.299 -123.722 181.644 251.753)" gradientUnits="userSpaceOnUse">
                    <stop offset="0.122263" stopColor="#236A96" stopOpacity="0.7" />
                    <stop offset="0.853424" stopColor="#A8C1D1" stopOpacity="0.5" />
                  </radialGradient>
                  <radialGradient id="paint4_radial_719_2185" cx="0" cy="0" r="1" gradientTransform="matrix(93.8408 -194.682 -191.064 -91.4565 463.167 278.606)" gradientUnits="userSpaceOnUse">
                    <stop offset="0.0062933" stopColor="#236A96" />
                    <stop offset="1" stopColor="#A8C1D1" />
                  </radialGradient>
                </defs>
              </svg>
            </div>
            <div className="">
              <h2 className="font-prata text-xl leading-none text-neutral-900">
                {title}
              </h2>
              <p className="font-inria text-sm text-neutral-700/90">
                {subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setView((prevView) => (prevView === "chat" ? "info" : "chat"))
            }
            className=" w-max h-max items-center group justify-center rounded-full cursor-pointer"
            aria-label="Toggle assistant info"
            aria-pressed={view === "info"}
          >
            {/* Question mark icon svg */}
            <svg
              viewBox="0 0 30 30"
              fill="none"
              className="w-9 stroke-black/60"
            >
              <path
                id="icon-main"
                d="M12.1201 11.9998C12.4336 11.1087 13.0523 10.3573 13.8667 9.87863C14.6811 9.39999 15.6386 9.22503 16.5697 9.38473C17.5007 9.54443 18.3452 10.0285 18.9536 10.7512C19.5619 11.4738 19.8949 12.3885 19.8935 13.3331C19.8935 15.9998 15.8935 17.3331 15.8935 17.3331V20.3145"
                stroke="black"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <path
                id="icon-alt"
                d="M19 9C19 9 16.5456 10.4978 15 11.5C13.8186 12.2661 13.1345 12.666 12 13.5C10.9926 14.2406 9.5 15.5 9.5 15.5C9.5 15.5 10.9216 17.4216 12 18.5C13.0784 19.5784 15 21 15 21L18.0003 23.5006"
                stroke="black"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ visibility: "hidden", position: "absolute" }}
              />
            </svg>
          </button>
        </header>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          {view === "info" ? (
            <div className="flex h-full flex-col gap-5 overflow-y-auto px-5 py-6 text-neutral-800 md:px-7 md:py-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h3 className="font-prata text-2xl">Hola, soy Syllie</h3>
                <p className="mt-2 max-w-2xl font-inria text-base text-neutral-700">
                  Soy Syllie, tu asistente dentro de Sale Enzo.
                </p>
              </div>

              <ul className="space-y-3 font-inria text-[1.03rem] leading-relaxed text-neutral-800">
                <li className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 text-neutral-500" />
                  <span>
                    Build full outfits from one item you already like.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 text-neutral-500" />
                  <span>
                    Find alternatives by vibe: casual, clean, or elevated.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 text-neutral-500" />
                  <span>
                    Suggest combinations that work with your favorite colors.
                  </span>
                </li>
              </ul>
            </div>
          ) : (
            <>
              <div className="flex min-h-0 flex-1 flex-col">
                {messages.length === 0 && (
                  <div className="px-5 pt-5 md:px-7">
                    <p className="mb-3 font-inria text-sm text-neutral-700">
                      Start with a prompt. I can help you style your next look.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-left font-inria text-sm text-neutral-800 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 flex-1 space-y-3 overflow-y-auto px-5 pb-4 md:px-7">
                  {messages.map((message) => {
                    const isUser = message.role === "user";

                    return (
                      <div
                        key={message.id}
                        className={`flex w-full animate-in fade-in slide-in-from-bottom-1.5 duration-300 ${isUser ? "justify-end" : "justify-start"
                          }`}
                      >
                        <div
                          className={`max-w-[84%] rounded-2xl px-4 py-2.5 font-inria text-[0.97rem] leading-relaxed shadow-sm md:max-w-[72%] ${isUser
                            ? "rounded-br-md bg-neutral-900 text-neutral-50"
                            : "rounded-bl-md border border-black/10 bg-white/80 text-neutral-900"
                            }`}
                        >
                          {message.content}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <footer className="border-t border-black/10 bg-white/50 px-5 py-4 md:px-7">
                <form
                  onSubmit={handleSubmit}
                  className="flex items-center gap-2"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    placeholder="Type a message..."
                    className="h-11 flex-1 rounded-xl border border-black/10 bg-white/85 px-4 font-inria text-[0.98rem] text-neutral-900 placeholder:text-neutral-500/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700"
                  />
                  <button
                    type="submit"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900 text-white transition hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700"
                    aria-label="Send message"
                  >
                    <SendHorizontal className="h-4.5 w-4.5" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-black/10 bg-white/85 text-neutral-700 transition hover:bg-white hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700"
                    aria-label="Voice input"
                  >
                    <Mic className="h-4.5 w-4.5" />
                  </button>
                </form>
              </footer>
            </>
          )}
        </div>
      </section>
    </div>
  );
};
