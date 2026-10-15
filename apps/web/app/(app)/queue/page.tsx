import { redirect } from "next/navigation";
export default function QueuePage() {
  redirect("/today?queue=open");
}
