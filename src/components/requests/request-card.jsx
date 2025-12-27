"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  MessageSquare,
  Wrench,
  ClipboardList,
  CheckCircle2,
  Radio,
} from "lucide-react";

function StatusBadge({ status }) {
  const variants = {
    submitted: {
      label: "Open",
      class: "bg-amber-500/15 text-amber-700 hover:bg-amber-500/15",
    },
    assigned: {
      label: "Assigned",
      class: "bg-blue-500/15 text-blue-700 hover:bg-blue-500/15",
    },
    in_progress: {
      label: "In Progress",
      class: "bg-purple-500/15 text-purple-700 hover:bg-purple-500/15",
    },
    completed: {
      label: "Completed",
      class: "bg-green-500/15 text-green-700 hover:bg-green-500/15",
    },
    cancelled: {
      label: "Cancelled",
      class: "bg-gray-500/10 text-gray-700 hover:bg-gray-500/10",
    },
  };

  const config = variants[status] || variants.submitted;

  return <Badge className={config.class}>{config.label}</Badge>;
}

function PriorityBadge({ priority }) {
  return (
    <p className="font-medium capitalize">
      {priority === "low" ? "Normal" : priority || "Normal"}
    </p>
  );
}


export default function RequestCard({
  request,
  showProperty = false,
  showTenant = false,
  available = false,
}) {
  // Compute isLive directly based on updated_at
  const isLive = (() => {
    if (request.updated_at) {
      const updatedAt = new Date(request.updated_at);
      const now = new Date();
      const diffInMinutes = Math.floor((now - updatedAt) / (1000 * 60));
      return diffInMinutes < 5;
    }
    return false;
  })();

  return (
    <Link href={`/dashboard/requests/${request.id}`}>
      <div className="rounded-2xl border bg-card hover:bg-muted/30 transition-all hover:shadow-sm overflow-hidden">
        {/* Header with Live indicator */}
        <div className="px-4 pt-4 pb-3 flex items-start justify-between border-b">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold text-lg">{request.title}</h3>
              {isLive && (
                <Badge className="bg-red-500/15 text-red-700 hover:bg-red-500/15 gap-1">
                  <Radio className="h-3 w-3" />
                  Live
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              {showProperty && request.property && (
                <>
                  <span>{request.property.name}</span>
                  <span>•</span>
                </>
              )}
              <span>Unit {request.unit?.unit_number}</span>
              <span>•</span>
              <span className="capitalize">
                {request.category || "Plumbing"}
              </span>
              {request.photos && request.photos.length > 0 && (
                <>
                  <span>•</span>
                  <span>{request.photos.length} photos</span>
                </>
              )}
            </div>
          </div>
          {available ? (
            <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/15">
              Available
            </Badge>
          ) : (
            <StatusBadge status={request.status} />
          )}
        </div>

        {/* Description */}
        <div className="p-4 bg-muted/30">
          <p className="font-medium mb-1 line-clamp-2">{request.title}</p>
          {request.tenant_notes && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              Tenant note: &quot;{request.tenant_notes}&quot;
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-4 mt-3">
            {request.photos && request.photos.length > 0 && (
              <div className="flex items-center gap-2 text-sm font-medium">
                <Camera className="h-4 w-4" />
                Photos
              </div>
            )}
            <div className="flex items-center gap-2 text-sm font-medium">
              <MessageSquare className="h-4 w-4" />
              Thread
            </div>
          </div>
        </div>

        {/* Assigned To */}
        {request.assigned_to && (
          <div className="px-4 py-3 border-t">
            <div className="flex items-center gap-2 mb-1">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Assigned to</span>
            </div>
            <p className="font-medium">
              {request.assignee?.full_name || "Maintenance"}
            </p>
          </div>
        )}

        {/* Priority */}
        <div className="px-4 py-3 border-t">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Priority</span>
          </div>
          <PriorityBadge priority={request.priority} />
        </div>

        {/* ETA */}
        {request.estimated_completion && (
          <div className="px-4 py-3 border-t">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">ETA</span>
            </div>
            <p className="font-medium">{request.estimated_completion}</p>
          </div>
        )}

        {/* Timeline */}
        {request.timeline && request.timeline.length > 0 && (
          <div className="px-4 py-3 border-t">
            <h4 className="font-semibold mb-3">Timeline</h4>
            <div className="space-y-2">
              {request.timeline.map((event, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">{event.label}</span>
                  <span className="font-medium">{event.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Latest Message */}
        {request.latest_message && (
          <div className="px-4 py-3 border-t bg-muted/30">
            <div className="flex items-start gap-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Message thread</p>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  &quot;{request.latest_message}&quot;
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}