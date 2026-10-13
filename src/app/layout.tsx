import type { Metadata } from "next";
import "./globals.css";
import {Toaster} from 'react-hot-toast'
import { BASE_OPEN_GRAPH, DEFAULT_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/seo/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    ...BASE_OPEN_GRAPH,
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
  },
};


export default async function RootLayout(props: {
  children: React.ReactNode;
}) {
  const { children } = props;

  return (
    <html lang="es" >
      <body
        className="font-inria antialiased"
        
      >
        {/* <Toaster
      position="bottom-right"
      
      toastOptions={{
    style: {
      padding: '16px',
      color: '#FAF9F6',
      backdropFilter: 'blur(10px)',
      background: 'rgba(12, 12, 12, 0.40)',
      border: '0.5px solid rgba(255, 255, 255, 0.2)',
    },
  }}
      /> */}
        <Toaster position="bottom-right" />
        {children}   
      </body>
    </html>
  );
}
