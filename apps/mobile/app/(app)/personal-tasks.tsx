import { router } from "expo-router";
import { WorkScreen } from "../../src/features/work/WorkScreen";
export default function PersonalTasks() { return <WorkScreen onAddTask={() => router.push("/task")} onOpenTask={taskId => router.push({ pathname: "/task", params: { taskId } })} />; }
