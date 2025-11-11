import { cn } from "@/lib/utils";

interface LoadingStateProps {
  title?: string;
  message?: string;
  hint?: string;
  emoji?: string;
  className?: string;
}

const sparkles = [
  "✨",
  "🚀",
  "🌈",
  "🎧",
  "🪄",
  "🎯",
  "🔥",
  "🌟",
  "🪐",
  "💫",
];

export function LoadingState({
  title = "Loading magic...",
  message = "Give us a second while we line everything up.",
  hint,
  emoji,
  className,
}: LoadingStateProps) {
  const funEmoji =
    emoji || sparkles[Math.floor(Math.random() * sparkles.length)];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 text-center py-14 px-6",
        className
      )}
    >
      <div className="relative">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 opacity-70 blur-2xl animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            <div className="w-20 h-20 rounded-[28px] bg-black/60 border border-white/10 backdrop-blur-xl flex items-center justify-center text-3xl">
              {funEmoji}
            </div>
            <div className="absolute -inset-3 rounded-[32px] border border-white/5 animate-[spin_8s_linear_infinite]" />
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-2xl font-black text-white mb-2">{title}</h3>
        <p className="text-white/70 text-sm max-w-sm mx-auto">{message}</p>
        {hint && (
          <p className="text-xs text-white/40 mt-3 uppercase tracking-wide">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

export default LoadingState;
