import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DeleteMaintenanceButton } from "./delete-button";
import { StatusButtons } from "./status-buttons";
import { SetPageContext } from "@/components/set-page-context";

const priorityLabels: Record<number, string> = {
  0: "Low",
  1: "Medium",
  2: "High",
  3: "Urgent",
};

const priorityStyles: Record<number, string> = {
  0: "bg-gray-100 text-gray-700 hover:bg-gray-100",
  1: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  2: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
  3: "bg-red-100 text-red-700 hover:bg-red-100",
};

const statusLabels: Record<number, string> = {
  0: "Open",
  1: "In Progress",
  2: "Completed",
  3: "Cancelled",
};

const statusStyles: Record<number, string> = {
  0: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
  1: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  2: "bg-green-100 text-green-700 hover:bg-green-100",
  3: "bg-gray-100 text-gray-700 hover:bg-gray-100",
};

export default async function MaintenanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const request = await prisma.maintenanceRequest.findUnique({
    where: { id, userId: session.user.id },
    include: {
      property: { select: { id: true, name: true } },
      unit: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (!request) notFound();

  return (
    <div>
      <SetPageContext context={`Maintenance request: "${request.title}" — ${statusLabels[request.status]} [${priorityLabels[request.priority]}]. ${request.category ? `Category: ${request.category}.` : ""} Property: ${request.property.name}${request.unit ? `, Unit: ${request.unit.name}` : ""}. ${request.contact ? `Reported by: ${request.contact.firstName} ${request.contact.lastName}.` : ""} Opened: ${request.createdAt.toISOString().split("T")[0]}. Request ID: ${request.id}. Full details visible on screen.`} />
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/maintenance" className="hover:text-gray-700">
              Maintenance
            </Link>
            <span>/</span>
            <span className="text-gray-900">{request.title}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{request.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className={statusStyles[request.status]}>
              {statusLabels[request.status]}
            </Badge>
            <Badge variant="secondary" className={priorityStyles[request.priority]}>
              {priorityLabels[request.priority]}
            </Badge>
            {request.category && (
              <Badge variant="outline">
                {request.category.charAt(0).toUpperCase() +
                  request.category.slice(1).replace("_", " ")}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/maintenance/${id}/edit`}>Edit</Link>
          </Button>
          <DeleteMaintenanceButton id={id} title={request.title} />
        </div>
      </div>

      {/* Status Actions */}
      {request.status < 2 && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <StatusButtons id={id} currentStatus={request.status} />
        </div>
      )}

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
          {request.description ? (
            <p className="text-gray-700 whitespace-pre-wrap">{request.description}</p>
          ) : (
            <p className="text-gray-500 italic">No description provided.</p>
          )}
          {request.completedAt && (
            <>
              <Separator className="my-4" />
              <p className="text-sm text-gray-600">
                Completed on {request.completedAt.toLocaleDateString()}
              </p>
            </>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Info</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">Property</dt>
              <dd>
                <Link
                  href={`/properties/${request.property.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {request.property.name}
                </Link>
              </dd>
            </div>
            {request.unit && (
              <div className="flex justify-between">
                <dt className="text-gray-600">Unit</dt>
                <dd>
                  <Link
                    href={`/units/${request.unit.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {request.unit.name}
                  </Link>
                </dd>
              </div>
            )}
            {request.contact && (
              <div className="flex justify-between">
                <dt className="text-gray-600">Reported By</dt>
                <dd>
                  <Link
                    href={`/tenants/${request.contact.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {request.contact.firstName} {request.contact.lastName}
                  </Link>
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-600">Created</dt>
              <dd className="text-gray-900">
                {request.createdAt.toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
