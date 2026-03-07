import { ChevronRight } from "lucide-react";
import Link from "next/link";

type BreadcrumbItem = {
    label: string;
    href?: string;
};

type PageHeaderProps = {
    title: string;
    description?: string;
    breadcrumbs?: BreadcrumbItem[];
    actions?: React.ReactNode;
};

export function PageHeader({
    title,
    description,
    breadcrumbs,
    actions,
}: PageHeaderProps) {
    return (
        <div className="mb-6">
            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
                <nav className="flex items-center gap-1 text-xs text-gray-400 mb-3">
                    {breadcrumbs.map((item, i) => (
                        <span key={i} className="flex items-center gap-1">
                            {i > 0 && <ChevronRight className="w-3 h-3" />}
                            {item.href ? (
                                <Link
                                    href={item.href}
                                    className="hover:text-primary-600 transition-colors"
                                >
                                    {item.label}
                                </Link>
                            ) : (
                                <span className="text-gray-600 font-medium">{item.label}</span>
                            )}
                        </span>
                    ))}
                </nav>
            )}

            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                    {description && (
                        <p className="text-sm text-gray-500 mt-1">{description}</p>
                    )}
                </div>
                {actions && <div className="shrink-0">{actions}</div>}
            </div>
        </div>
    );
}
