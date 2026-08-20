import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  return (
    <div>
      <PageHeader eyebrow="Overview" title={`Welcome back, ${user?.name.split(" ")[0]}`} description="Your personalized dashboard is being assembled." />
      <Card>
        <CardContent className="text-[13.5px] text-muted">Dashboard content coming online shortly.</CardContent>
      </Card>
    </div>
  );
}
