export default function TaskTodoCard() {
    return (
        <div className="card bg-base-200 shadow h-fit">
            <div className="card-body p-5 md:p-6 gap-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <h3 className="font-semibold leading-tight truncate">
                                Tâches de la maison
                            </h3>
                            <span className="badge badge-ghost badge-outline badge-sm opacity-70 shrink-0">
                                Todo
                            </span>
                        </div>
                        <span className="opacity-70 italic">
                            Organisation des tâches partagées du foyer
                        </span>
                    </div>
                    <span className="badge badge-info badge-sm">En préparation</span>
                </div>

                <div className="bg-base-100 rounded-3xl p-4 md:p-5 space-y-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-50 mb-2">
                            TODO
                        </p>
                        <p className="leading-relaxed opacity-80">
                            Cette carte affichera bientôt un aperçu des tâches à faire :
                            priorités du jour, répartition entre les membres et suivi des
                            éléments terminés.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-base-200/70 px-4 py-3">
                            <p className="text-sm opacity-60 mb-1">Prévu</p>
                            <p className="font-medium">Tâches du jour</p>
                        </div>
                        <div className="rounded-2xl bg-base-200/70 px-4 py-3">
                            <p className="text-sm opacity-60 mb-1">Prévu</p>
                            <p className="font-medium">Priorités urgentes</p>
                        </div>
                        <div className="rounded-2xl bg-base-200/70 px-4 py-3 sm:col-span-2">
                            <p className="text-sm opacity-60 mb-1">Prévu</p>
                            <p className="font-medium">
                                Suivi d'avancement des tâches familiales
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
