import TaskTodoCard from "~/components/tasks_components/TaskTodoCard";

export function meta() {
    return [
        {
            title: "Tâches - NestBoard",
        },
    ];
}

export default function TaskHome() {
    return (
        <div className="pt-4 md:px-4 md:max-w-3/4 xxl:max-w-2/3 mx-auto">
            <TaskTodoCard />
        </div>
    );
}
