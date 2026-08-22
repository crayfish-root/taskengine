import { canManageProject } from "./project-permissions";
import { canActOnTask } from "./task-permissions";
import { ELEVATED_LEVELS } from "./org";

/**
 * Can `userId` (at `userLevel`) see this document? Non-restricted documents are visible to
 * everyone, matching the app's default company-wide transparency. Restricted documents are
 * visible only to the uploader, elevated roles, and — if the doc is attached to a project or
 * task — that project/task's team.
 */
export async function canViewDocument(
  userId: string,
  userLevel: string,
  doc: { uploadedById: string; restricted: boolean; projectId: string | null; taskId: string | null }
) {
  if (!doc.restricted) return true;
  if (doc.uploadedById === userId) return true;
  if (ELEVATED_LEVELS.has(userLevel)) return true;
  if (doc.projectId && (await canManageProject(userId, doc.projectId))) return true;
  if (doc.taskId && (await canActOnTask(userId, doc.taskId))) return true;
  return false;
}
