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
  onClose: () => void;
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
  title = "Syllie",
  onClose,
  subtitle = "Style Assistant",
  suggestions = DEFAULT_SUGGESTIONS,
}: ChatModalProps) => {
  const [view, setView] = useState<"chat" | "info">("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingTimeoutsRef = useRef<number[]>([]);

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

        <header className="bg-off-white shadow-md relative z-10 my-5 flex items-center justify-between border-b border-black/10 px-10 py-4">
          <div className="flex items-center gap-3 ">
            <div className="sillye-chat-position flex w-14">
              {/* syllie face */}
              <svg viewBox="0 0 52 36" fill="none" className="w-full h-auto">
                <g id="sillye-3d">
                  <g
                    id="cara-con-gradients"
                    filter="url(#filter0_dii_719_2195)"
                  >
                    <path
                      d="M2.60537 12.5995C1.46415 15.0123 0.614829 16.5413 0.512445 19.2765C0.412271 21.9526 0.916824 24.3364 2.02665 25.9585C3.6282 28.2992 4.85112 29.1914 7.14804 30.5845C9.96322 32.2919 11.9332 32.5187 15.1498 33.1545C19.218 33.9585 25.7493 33.6685 25.7493 33.6685C25.7493 33.6685 32.9077 33.6959 37.3583 32.7456C40.2054 32.1378 42.0409 32.1694 44.4986 30.5845C46.9579 28.9985 48.2833 27.4753 49.472 24.9305C50.4186 22.9038 50.5601 21.5193 50.4814 19.2765C50.3859 16.5499 49.5871 14.9784 48.4625 12.5995C47.4406 10.4378 46.464 8.77709 44.4986 6.94553C42.4593 5.04507 40.505 3.3494 37.3583 2.31951C32.686 0.790342 30.2579 0.445127 25.686 0.506681C21.5333 0.562592 19.087 0.884701 15.1498 2.31951C11.7666 3.55246 9.84055 4.52225 7.14804 6.94553C5.04887 8.8348 3.82111 10.0293 2.60537 12.5995Z"
                      fill="url(#paint0_radial_719_2195)"
                    />
                    <path
                      d="M2.60537 12.5995C1.46415 15.0123 0.614829 16.5413 0.512445 19.2765C0.412271 21.9526 0.916824 24.3364 2.02665 25.9585C3.6282 28.2992 4.85112 29.1914 7.14804 30.5845C9.96322 32.2919 11.9332 32.5187 15.1498 33.1545C19.218 33.9585 25.7493 33.6685 25.7493 33.6685C25.7493 33.6685 32.9077 33.6959 37.3583 32.7456C40.2054 32.1378 42.0409 32.1694 44.4986 30.5845C46.9579 28.9985 48.2833 27.4753 49.472 24.9305C50.4186 22.9038 50.5601 21.5193 50.4814 19.2765C50.3859 16.5499 49.5871 14.9784 48.4625 12.5995C47.4406 10.4378 46.464 8.77709 44.4986 6.94553C42.4593 5.04507 40.505 3.3494 37.3583 2.31951C32.686 0.790342 30.2579 0.445127 25.686 0.506681C21.5333 0.562592 19.087 0.884701 15.1498 2.31951C11.7666 3.55246 9.84055 4.52225 7.14804 6.94553C5.04887 8.8348 3.82111 10.0293 2.60537 12.5995Z"
                      fill="url(#paint1_radial_719_2195)"
                    />
                  </g>
                  <g id="ojo-izq-gradient">
                    <path
                      d="M14.985 11.1993C14.0186 11.0024 13.7554 10.9045 12.7948 11.1288C11.1421 11.5149 10.1089 12.2031 9.26163 13.6988C8.46753 15.1007 8.57913 16.2816 8.92818 17.8813C9.21305 19.1869 9.67499 19.8552 10.427 20.9431L10.4424 20.9653C11.6485 22.7101 12.9739 24.2398 14.4803 24.5633C15.6534 24.8152 16.3658 24.9323 17.5087 24.5633C18.7691 24.1563 19.9132 23.3286 20.7758 22.308C21.712 21.2005 21.8376 20.2729 21.7853 18.71C21.7428 17.4412 21.4345 16.9836 20.7758 15.626C20.2167 14.4737 19.7343 13.8691 18.7569 13.056C17.7328 12.2041 16.2816 11.4633 14.985 11.1993Z"
                      fill="url(#paint2_radial_719_2195)"
                    />
                    <path
                      d="M14.985 11.1993C14.0186 11.0024 13.7554 10.9045 12.7948 11.1288C11.1421 11.5149 10.1089 12.2031 9.26163 13.6988C8.46753 15.1007 8.57913 16.2816 8.92818 17.8813C9.21305 19.1869 9.67499 19.8552 10.427 20.9431L10.4424 20.9653C11.6485 22.7101 12.9739 24.2398 14.4803 24.5633C15.6534 24.8152 16.3658 24.9323 17.5087 24.5633C18.7691 24.1563 19.9132 23.3286 20.7758 22.308C21.712 21.2005 21.8376 20.2729 21.7853 18.71C21.7428 17.4412 21.4345 16.9836 20.7758 15.626C20.2167 14.4737 19.7343 13.8691 18.7569 13.056C17.7328 12.2041 16.2816 11.4633 14.985 11.1993Z"
                      fill="url(#paint3_radial_719_2195)"
                    />
                  </g>
                  <path
                    id="ojo-der-gradient"
                    d="M35.6566 11.193C36.6222 11.0024 36.8852 10.9075 37.8451 11.1248C39.4965 11.4987 40.5289 12.1653 41.3755 13.6139C42.169 14.9716 42.0575 16.1154 41.7087 17.6648C41.4241 18.9293 40.9625 19.5765 40.211 20.6302L40.1957 20.6517C38.9905 22.3417 37.6661 23.8232 36.1609 24.1365C34.9886 24.3805 34.2768 24.4939 33.1348 24.1365C31.8753 23.7423 30.7321 22.9406 29.8702 21.9522C28.9347 20.8795 28.8092 19.9811 28.8615 18.4674C28.9039 17.2385 29.212 16.7953 29.8702 15.4804C30.4288 14.3644 30.9109 13.7789 31.8876 12.9913C32.9108 12.1662 34.361 11.4488 35.6566 11.193Z"
                    fill="url(#paint4_radial_719_2195)"
                  />
                </g>
                <defs>
                  <filter
                    id="filter0_dii_719_2195"
                    x="0"
                    y="-3.5"
                    width="52"
                    height="38.7197"
                    filterUnits="userSpaceOnUse"
                    colorInterpolationFilters="sRGB"
                  >
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feColorMatrix
                      in="SourceAlpha"
                      type="matrix"
                      values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                      result="hardAlpha"
                    />
                    <feOffset dx="0.5" dy="0.5" />
                    <feGaussianBlur stdDeviation="0.5" />
                    <feComposite in2="hardAlpha" operator="out" />
                    <feColorMatrix
                      type="matrix"
                      values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
                    />
                    <feBlend
                      mode="normal"
                      in2="BackgroundImageFix"
                      result="effect1_dropShadow_719_2195"
                    />
                    <feBlend
                      mode="normal"
                      in="SourceGraphic"
                      in2="effect1_dropShadow_719_2195"
                      result="shape"
                    />
                    <feColorMatrix
                      in="SourceAlpha"
                      type="matrix"
                      values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                      result="hardAlpha"
                    />
                    <feOffset dx="1" dy="1" />
                    <feGaussianBlur stdDeviation="2" />
                    <feComposite
                      in2="hardAlpha"
                      operator="arithmetic"
                      k2="-1"
                      k3="1"
                    />
                    <feColorMatrix
                      type="matrix"
                      values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
                    />
                    <feBlend
                      mode="normal"
                      in2="shape"
                      result="effect2_innerShadow_719_2195"
                    />
                    <feColorMatrix
                      in="SourceAlpha"
                      type="matrix"
                      values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                      result="hardAlpha"
                    />
                    <feOffset dx="1" dy="-4" />
                    <feGaussianBlur stdDeviation="2" />
                    <feComposite
                      in2="hardAlpha"
                      operator="arithmetic"
                      k2="-1"
                      k3="1"
                    />
                    <feColorMatrix
                      type="matrix"
                      values="0 0 0 0 0.696154 0 0 0 0 0.696154 0 0 0 0 0.696154 0 0 0 0.25 0"
                    />
                    <feBlend
                      mode="normal"
                      in2="effect2_innerShadow_719_2195"
                      result="effect3_innerShadow_719_2195"
                    />
                  </filter>
                  <radialGradient
                    id="paint0_radial_719_2195"
                    cx="0"
                    cy="0"
                    r="1"
                    gradientTransform="matrix(2.74849 37.4408 -20.9538 1.57934 12.134 -3.72138)"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#4A4A48" />
                    <stop
                      offset="0.383855"
                      stopColor="#444440"
                      stopOpacity="0.9"
                    />
                    <stop offset="1" stopColor="#373732" stopOpacity="0.95" />
                  </radialGradient>
                  <radialGradient
                    id="paint1_radial_719_2195"
                    cx="0"
                    cy="0"
                    r="1"
                    gradientTransform="matrix(30.4651 14.3725 -21.7608 47.8598 5.17442 14.17)"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#6F6F6B" />
                    <stop
                      offset="0.506669"
                      stopColor="#393934"
                      stopOpacity="0.5"
                    />
                    <stop offset="1" stopColor="#5D5D5A" stopOpacity="0.5" />
                  </radialGradient>
                  <radialGradient
                    id="paint2_radial_719_2195"
                    cx="0"
                    cy="0"
                    r="1"
                    gradientTransform="matrix(-14.6374 -9.76602 17.6741 -27.4714 22.216 23.336)"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0.122263" stopColor="#236A96" />
                    <stop offset="0.853424" stopColor="#A8C1D1" />
                  </radialGradient>
                  <radialGradient
                    id="paint3_radial_719_2195"
                    cx="0"
                    cy="0"
                    r="1"
                    gradientTransform="matrix(-5.04737 -7.71001 13.9532 -9.47288 14.1402 19.738)"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop
                      offset="0.122263"
                      stopColor="#236A96"
                      stopOpacity="0.7"
                    />
                    <stop
                      offset="0.853424"
                      stopColor="#A8C1D1"
                      stopOpacity="0.5"
                    />
                  </radialGradient>
                  <radialGradient
                    id="paint4_radial_719_2195"
                    cx="0"
                    cy="0"
                    r="1"
                    gradientTransform="matrix(7.06632 -14.906 -14.3873 -7.00247 35.339 21.794)"
                    gradientUnits="userSpaceOnUse"
                  >
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
                        className={`flex w-full animate-in fade-in slide-in-from-bottom-1.5 duration-300 ${
                          isUser ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[84%] rounded-2xl px-4 py-2.5 font-inria text-[0.97rem] leading-relaxed shadow-sm md:max-w-[72%] ${
                            isUser
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
