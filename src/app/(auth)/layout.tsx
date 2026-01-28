import type { Metadata } from "next";

import { HeaderBar } from "@/components/main/HeaderLayout/HeaderBar";
import { Logo } from "@/components/main/HeaderLayout/Logo";
import Link from "next/link";


export const metadata: Metadata = {
  title: "App Layout",
  description: "Layout for the application with header and music player",
};

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="relative h-screen overflow-hidden">
       {/* sillye svg head */}
      <svg width="1077" height="705" viewBox="0 0 1077 705" fill="none"
      className="absolute top-40 -right-30 scale-110">
        <g filter="url(#filter0_dii_410_738)">
        <path d="M45.7655 256.424C21.2292 307.457 2.96882 339.798 0.767573 397.651C-1.38618 454.255 9.46173 504.677 33.3229 538.985C67.7564 588.496 94.0491 607.367 143.433 636.832C203.959 672.947 246.315 677.744 315.472 691.192C402.936 708.199 543.361 702.064 543.361 702.064C543.361 702.064 697.265 702.643 792.953 682.544C854.166 669.686 893.63 670.356 946.47 636.832C999.344 603.287 1027.84 571.068 1053.4 517.242C1073.75 474.375 1076.79 445.089 1075.1 397.651C1073.05 339.979 1055.87 306.741 1031.69 256.424C1009.72 210.7 988.726 175.573 946.47 136.833C902.624 96.6351 860.608 60.7691 792.953 38.9854C692.5 6.64117 640.294 -0.660639 542 0.641319C452.717 1.82392 400.12 8.63701 315.472 38.9854C242.732 65.0642 201.322 85.5768 143.433 136.833C98.3007 176.794 71.9038 202.058 45.7655 256.424Z" fill="url(#paint0_radial_410_738)" shapeRendering="crispEdges"/>
        <path d="M45.7655 256.424C21.2292 307.457 2.96882 339.798 0.767573 397.651C-1.38618 454.255 9.46173 504.677 33.3229 538.985C67.7564 588.496 94.0491 607.367 143.433 636.832C203.959 672.947 246.315 677.744 315.472 691.192C402.936 708.199 543.361 702.064 543.361 702.064C543.361 702.064 697.265 702.643 792.953 682.544C854.166 669.686 893.63 670.356 946.47 636.832C999.344 603.287 1027.84 571.068 1053.4 517.242C1073.75 474.375 1076.79 445.089 1075.1 397.651C1073.05 339.979 1055.87 306.741 1031.69 256.424C1009.72 210.7 988.726 175.573 946.47 136.833C902.624 96.6351 860.608 60.7691 792.953 38.9854C692.5 6.64117 640.294 -0.660639 542 0.641319C452.717 1.82392 400.12 8.63701 315.472 38.9854C242.732 65.0642 201.322 85.5768 143.433 136.833C98.3007 176.794 71.9038 202.058 45.7655 256.424Z" fill="url(#paint1_radial_410_738)" shapeRendering="crispEdges"/>
        </g>
        <path d="M311.93 226.794C291.152 222.631 285.494 220.559 264.841 225.304C229.308 233.469 207.095 248.027 188.878 279.664C171.805 309.314 174.204 334.292 181.709 368.129C187.834 395.744 197.765 409.879 213.934 432.89L214.264 433.36C240.195 470.266 268.692 502.621 301.079 509.463C326.302 514.792 341.617 517.269 366.19 509.463C393.289 500.855 417.887 483.347 436.433 461.761C456.56 438.335 459.26 418.715 458.137 385.658C457.224 358.821 450.595 349.142 436.433 320.426C424.412 296.053 414.041 283.266 393.025 266.067C371.009 248.048 339.807 232.38 311.93 226.794Z" fill="url(#paint2_radial_410_738)"/>
        <path d="M311.93 226.794C291.152 222.631 285.494 220.559 264.841 225.304C229.308 233.469 207.095 248.027 188.878 279.664C171.805 309.314 174.204 334.292 181.709 368.129C187.834 395.744 197.765 409.879 213.934 432.89L214.264 433.36C240.195 470.266 268.692 502.621 301.079 509.463C326.302 514.792 341.617 517.269 366.19 509.463C393.289 500.855 417.887 483.347 436.433 461.761C456.56 438.335 459.26 418.715 458.137 385.658C457.224 358.821 450.595 349.142 436.433 320.426C424.412 296.053 414.041 283.266 393.025 266.067C371.009 248.048 339.807 232.38 311.93 226.794Z" fill="url(#paint3_radial_410_738)"/>
        <path d="M756.373 226.661C777.135 222.629 782.789 220.622 803.426 225.219C838.932 233.127 861.128 247.227 879.331 277.868C896.391 306.585 893.994 330.777 886.495 363.549C880.375 390.296 870.451 403.986 854.294 426.273L853.964 426.728C828.053 462.472 799.578 493.809 767.216 500.436C742.012 505.598 726.709 507.996 702.155 500.436C675.077 492.099 650.497 475.142 631.966 454.235C611.854 431.546 609.155 412.544 610.278 380.526C611.19 354.534 617.815 345.159 631.966 317.347C643.977 293.741 654.341 281.356 675.34 264.698C697.339 247.247 728.517 232.071 756.373 226.661Z" fill="url(#paint4_radial_410_738)"/>
        <defs>
        <filter id="filter0_dii_410_738" x="0" y="-3.5" width="1077" height="708.141" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
        <feOffset dx="0.5" dy="0.5"/>
        <feGaussianBlur stdDeviation="0.5"/>
        <feComposite in2="hardAlpha" operator="out"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
        <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_410_738"/>
        <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_410_738" result="shape"/>
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
        <feOffset dx="1" dy="1"/>
        <feGaussianBlur stdDeviation="2"/>
        <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
        <feBlend mode="normal" in2="shape" result="effect2_innerShadow_410_738"/>
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
        <feOffset dx="1" dy="-4"/>
        <feGaussianBlur stdDeviation="2"/>
        <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0.696154 0 0 0 0 0.696154 0 0 0 0 0.696154 0 0 0 0.25 0"/>
        <feBlend mode="normal" in2="effect2_innerShadow_410_738" result="effect3_innerShadow_410_738"/>
        </filter>
        <radialGradient id="paint0_radial_410_738" cx="0" cy="0" r="1" gradientTransform="matrix(435 826 -469.996 247.366 199 -48.8586)" gradientUnits="userSpaceOnUse">
        <stop stopColor="#A1A19A" stopOpacity="0.5"/>
        <stop offset="0.567385" stopColor="#676766"/>
        <stop offset="1" stopColor="#373732"/>
        </radialGradient>
        <radialGradient id="paint1_radial_410_738" cx="0" cy="0" r="1" gradientTransform="matrix(655 304 -467.856 1012.31 101 289.641)" gradientUnits="userSpaceOnUse">
        <stop stopColor="#A1A19A"/>
        <stop offset="0.506669" stopColor="#393934" stopOpacity="0.5"/>
        <stop offset="1" stopColor="#21211D" stopOpacity="0.5"/>
        </radialGradient>
        <radialGradient id="paint2_radial_410_738" cx="0" cy="0" r="1" gradientTransform="matrix(-314.704 -206.566 379.993 -581.061 467.397 483.505)" gradientUnits="userSpaceOnUse">
        <stop offset="0.122263" stopColor="#236A96"/>
        <stop offset="0.853424" stopColor="#A8C1D1"/>
        </radialGradient>
        <radialGradient id="paint3_radial_410_738" cx="0" cy="0" r="1" gradientTransform="matrix(-108.519 -163.078 299.995 -200.366 293.768 407.402)" gradientUnits="userSpaceOnUse">
        <stop offset="0.122263" stopColor="#236A96" stopOpacity="0.7"/>
        <stop offset="0.853424" stopColor="#A8C1D1" stopOpacity="0.5"/>
        </radialGradient>
        <radialGradient id="paint4_radial_410_738" cx="0" cy="0" r="1" gradientTransform="matrix(151.926 -315.285 -309.328 -148.113 749.546 450.889)" gradientUnits="userSpaceOnUse">
        <stop offset="0.0062933" stopColor="#236A96"/>
        <stop offset="1" stopColor="#A8C1D1"/>
        </radialGradient>
        </defs>
      </svg>
        <HeaderBar />
        {children}  
        {/* <MusicPlayer/> */}
    </main>
  );
}
