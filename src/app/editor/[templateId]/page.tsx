import { redirect } from "next/navigation";

export default async function OldEditorRedirect({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  redirect(`/dashboard/editor/${templateId}`);
}
