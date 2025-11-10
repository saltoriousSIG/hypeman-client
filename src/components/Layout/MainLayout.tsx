import { ReactNode } from "react"
import Header from "@/components/Header/Header"
import Footer from "@/components/Footer/Footer"

interface MainLayoutProps {
    children: ReactNode
    className?: string
}

/**
 * MainLayout component provides consistent page structure across the app
 * Includes decorative background elements, header, and footer
 * 
 * @param children - Page-specific content
 * @param className - Optional additional classes for the content container
 */
export default function MainLayout({ children, className = "" }: MainLayoutProps) {
    return (
        <div className="min-h-screen bg-black text-white pb-20 relative overflow-hidden">
            {/* Decorative floating background elements */}
            {/* <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-20 left-8 w-20 h-20 bg-purple-500/30 rounded-full blur-xl animate-pulse"></div>
                <div className="absolute top-40 right-12 w-16 h-16 bg-green-400/40 rounded-full blur-lg animate-bounce"></div>
                <div className="absolute top-60 left-16 w-12 h-12 bg-yellow-400/50 rounded-full blur-md animate-pulse"></div>
                <div className="absolute bottom-40 right-8 w-24 h-24 bg-blue-500/25 rounded-full blur-xl animate-pulse"></div>
                <div className="absolute bottom-60 left-12 w-8 h-8 bg-pink-400/60 rounded-full blur-sm animate-bounce"></div>
                <div className="absolute top-80 right-20 w-14 h-14 bg-cyan-400/35 rounded-full blur-lg animate-pulse"></div>
                <div className="absolute top-32 right-32 w-6 h-6 bg-white/40 rounded-full blur-sm"></div>
                <div className="absolute bottom-32 left-32 w-10 h-10 bg-purple-400/30 rounded-full blur-md animate-bounce"></div>
                <div className="absolute top-96 left-6 w-4 h-4 bg-green-300/50 rounded-full blur-sm"></div>
            </div> */}

            <Header />

            {/* Main content area with relative z-index to appear above decorative elements */}
            <div className={`pt-16 px-4 relative z-10 ${className}`}>
                {children}
            </div>

            <Footer />
        </div>
    )
}

