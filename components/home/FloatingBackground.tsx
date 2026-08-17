"use client";

export default function FloatingBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Cyber Grid */}
            <div
                className="absolute inset-0 opacity-[0.06]"
                style={{
                    backgroundImage: `
            linear-gradient(rgba(9,150,124,0.18) 1px, transparent 1px),
            linear-gradient(90deg, rgba(9,150,124,0.18) 1px, transparent 1px)
          `,
                    backgroundSize: "56px 56px",
                    maskImage:
                        "radial-gradient(circle at center, black 45%, transparent 100%)",
                    WebkitMaskImage:
                        "radial-gradient(circle at center, black 45%, transparent 100%)",
                }}
            />

            {/* Animated glow orbs */}
            <div className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-[var(--primary)]/18 blur-3xl animate-float-slow" />
            <div className="absolute top-1/3 -left-24 h-80 w-80 rounded-full bg-emerald-400/12 blur-3xl animate-float-medium" />
            <div className="absolute bottom-[-8rem] right-1/4 h-[28rem] w-[28rem] rounded-full bg-teal-300/10 blur-3xl animate-float-fast" />

            {/* Soft radial spotlight */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(9,150,124,0.12),transparent_60%)]" />

            {/* Floating particles */}
            <div className="absolute inset-0">
                {Array.from({ length: 22 }).map((_, index) => {
                    const left = ((index * 13) % 100) + "%";
                    const top = ((index * 17) % 100) + "%";
                    const delay = `${(index % 7) * 0.7}s`;
                    const duration = `${8 + (index % 5) * 2}s`;

                    return (
                        <span
                            key={index}
                            className="absolute h-1.5 w-1.5 rounded-full bg-[var(--primary)]/50 animate-particle"
                            style={{
                                left,
                                top,
                                animationDelay: delay,
                                animationDuration: duration,
                            }}
                        />
                    );
                })}
            </div>

            {/* Bottom fade */}
            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[var(--background)] to-transparent" />

            <style jsx>{`
        @keyframes floatSlow {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(-18px, 24px, 0) scale(1.06);
          }
        }

        @keyframes floatMedium {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(20px, -18px, 0) scale(1.08);
          }
        }

        @keyframes floatFast {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(-12px, -22px, 0) scale(1.04);
          }
        }

        @keyframes particle {
          0% {
            transform: translateY(0) scale(0.8);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          50% {
            transform: translateY(-18px) scale(1);
          }
          85% {
            opacity: 1;
          }
          100% {
            transform: translateY(-36px) scale(0.8);
            opacity: 0;
          }
        }

        .animate-float-slow {
          animation: floatSlow 18s ease-in-out infinite;
        }

        .animate-float-medium {
          animation: floatMedium 14s ease-in-out infinite;
        }

        .animate-float-fast {
          animation: floatFast 10s ease-in-out infinite;
        }

        .animate-particle {
          animation: particle 10s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-float-slow,
          .animate-float-medium,
          .animate-float-fast,
          .animate-particle {
            animation: none;
          }
        }
      `}</style>
        </div>
    );
}