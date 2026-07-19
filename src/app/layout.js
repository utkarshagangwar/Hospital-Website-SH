import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Loader from "../components/Loader";
import PageTransition from "../components/PageTransition";
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
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body suppressHydrationWarning>
        <LoaderProvider>
          <Loader />
          <Analytics />
          <Header />
          <PageTransition>{children}</PageTransition>
          <Footer />

          {/* Global Floating Book Button */}
          <FloatingBookButton />
        </LoaderProvider>
      </body>
    </html>
  );
}
