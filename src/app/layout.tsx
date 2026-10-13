import type { Metadata } from "next";
import "./globals.css";
import {Toaster} from 'react-hot-toast'

export const metadata: Metadata = {
  title: { default: "Sale Enzo", template: "%s | Sale Enzo" },
  description: "Prendas de segunda mano seleccionadas con cuidado.",
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
