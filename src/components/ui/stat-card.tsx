import { cn } from "@/lib/utils";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

type StatCardProps = {
    label: string;
    value: string | number;
    icon: LucideIcon;
    gradient?: string;
    trend?: { value: number; label: string };
    className?: string;
    size?: "default" | "sm";
};

export function StatCard({
    label,
    value,
    icon: Icon,
    gradient = "stat-gradient-blue",
    trend,
    className,
    size = "default",
}: StatCardProps) {
    const compact = size === "sm";

    return (
        <div className={cn(
            "bg-white rounded-2xl border border-gray-100 shadow-card hover:shadow-elevated transition-all hover:-translate-y-0.5",
            compact ? "p-4" : "p-6",
            className
        )}>
            <div className={cn("flex items-center justify-between", compact ? "mb-3" : "mb-4")}>
                <div className={cn("inline-flex rounded-xl text-white", compact ? "p-2.5" : "p-3", gradient)}>
                    <Icon className={compact ? "w-4 h-4" : "w-6 h-6"} />
                </div>
                {trend && (
                    <span className={cn(
                        "flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full",
                        trend.value > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                    )}>
                        <ArrowUpRight className={cn("w-3 h-3", trend.value < 0 && "rotate-45")} />
                        {trend.value > 0 ? "+" : ""}
                        {trend.value}%
                    </span>
                )}
            </div>
            <p className={cn("font-bold text-gray-900 mb-1", compact ? "text-2xl" : "text-3xl")}>{value}</p>
            <p className={cn("text-gray-500", compact ? "text-xs" : "text-sm")}>{label}</p>
            {trend && <p className="text-xs text-gray-400 mt-0.5">{trend.label}</p>}
        </div>
    );
}
