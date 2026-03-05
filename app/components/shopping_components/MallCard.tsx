import type { MallBase } from "~/types/mall";
import { capitalizeAllWords, capitalizeFirstLetter } from "~/tools/formater";

export default function MallCard({
    mall,
    onEdit,
    onDelete,
}: {
    mall: MallBase;
    onEdit: (mall: MallBase) => void;
    onDelete: (mall: MallBase) => void;
}) {
    const name = capitalizeAllWords(
        capitalizeFirstLetter(mall.name?.trim() || "Magasin"),
    );
    const location = capitalizeAllWords(
        capitalizeFirstLetter((mall.location ?? "").toString().trim()),
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
                                #{mall.id}
                            </span>
                        </div>
                        <p className="text-sm opacity-70 truncate">
                            {location || "Localisation —"}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => onEdit(mall)}
                        >
                            Éditer
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-error btn-outline"
                            onClick={() => onDelete(mall)}
                        >
                            Supprimer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
