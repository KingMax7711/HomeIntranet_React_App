import type { CategoryBase } from "~/types/category";
import { capitalizeAllWords, capitalizeFirstLetter } from "~/tools/formater";

export default function CategoryCard({
    category,
    onEdit,
    onDelete,
}: {
    category: CategoryBase;
    onEdit: (category: CategoryBase) => void;
    onDelete: (category: CategoryBase) => void;
}) {
    const name = capitalizeAllWords(
        capitalizeFirstLetter(category.name?.trim() || "Catégorie"),
    );

    return (
        <div className="card bg-base-100 shadow">
            <div className="card-body p-4 gap-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <h3 className="font-semibold leading-tight truncate">
                                {name}
                            </h3>
                            <span className="badge badge-ghost badge-outline badge-sm opacity-70 shrink-0">
                                #{category.id}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => onEdit(category)}
                        >
                            Éditer
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-error btn-outline"
                            onClick={() => onDelete(category)}
                        >
                            Supprimer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
