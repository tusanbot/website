"use client";

type Props = {
    title: string;
    description: string;
    icon: string;
};

export default function AdminPlaceholder({
    title,
    description,
    icon,
}: Props) {
    return (
        <div className="bg-white rounded-2xl shadow p-10 text-center">
            <div className="text-5xl mb-4">
                {icon}
            </div>

            <h2 className="text-2xl font-bold text-gray-800">
                {title}
            </h2>

            <p className="text-gray-500 mt-2">
                {description}
            </p>

            <p className="text-sm text-gray-400 mt-6">
                این بخش در مرحله بعدی توسعه فعال خواهد شد.
            </p>
        </div>
    );
}