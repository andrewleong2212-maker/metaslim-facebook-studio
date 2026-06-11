import { ClockCounterClockwise } from "@phosphor-icons/react/ssr";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/state-panels";

export function VersionHistoryPanel() { return <Card><CardContent><div className="mb-4 flex items-center gap-2 font-semibold"><ClockCounterClockwise className="text-brand-600"/>Version History</div><EmptyState compact title="还没有版本" description="每次生成、编辑或恢复都会建立不可覆盖的新版本。"/></CardContent></Card>; }
