import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Loader from "../components/Loader";
import { LoaderProvider } from "../context/LoaderContext";
import FloatingBookButton from "../components/FloatingBookButton";
import { Analytics } from '@vercel/analytics/next';

export const metadata = {
  title: "Shivaji Hospital & Heart Care Centre",
  description: "Advanced cardiac and diabetes care in Farrukhabad. Dr. Varun Gangwar.",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      </head>
      <body suppressHydrationWarning>
        <LoaderProvider>
          <Loader />
          <Analytics />
          <Header />
          {children}
          <Footer />

          {/* Global Floating Book Button */}
          <FloatingBookButton />
        </LoaderProvider>
      </body>
    </html>
  );
}
