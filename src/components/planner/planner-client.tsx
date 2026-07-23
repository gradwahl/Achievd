"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Save,
  Trash2,
} from "lucide-react";
import { productConfig } from "@/config/product";
import type { PinPriority, PinState, PlannerItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type ApiResponse =
  | { ok: true; item?: PlannerItem; items?: PlannerItem[] }
  | { ok: false; message: string };

export function PlannerClient({
  initialItems,
  csrfToken,
}: {
  initialItems: PlannerItem[];
  csrfToken: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [toast, setToast] = useState("");
  const [isPending, startTransition] = useTransition();
  const groups = useMemo(() => groupByGame(items), [items]);

  async function patchPin(pinId: string, patch: Partial<PlannerItem>) {
    const response = await fetch(`/api/planner/${pinId}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        [productConfig.csrfHeader]: csrfToken,
      },
      body: JSON.stringify(patch),
    });
    const body = (await response.json()) as ApiResponse;
    if (!body.ok || !body.item) {
      setToast(body.ok ? "Planner update failed." : body.message);
      return;
    }
    setItems((current) =>
      current.map((item) => (item.id === pinId ? body.item! : item)),
    );
    setToast("Planner updated.");
  }

  async function removePin(pinId: string) {
    const response = await fetch(`/api/planner/${pinId}`, {
      method: "DELETE",
      headers: { [productConfig.csrfHeader]: csrfToken },
    });
    const body = (await response.json()) as ApiResponse;
    if (!body.ok) {
      setToast(body.message);
      return;
    }
    setItems((current) => current.filter((item) => item.id !== pinId));
    setToast("Archived pinned achievement.");
  }

  async function move(index: number, direction: -1 | 1) {
    const next = [...items];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    setItems(next.map((item, position) => ({ ...item, position })));
    const response = await fetch("/api/planner/reorder", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [productConfig.csrfHeader]: csrfToken,
      },
      body: JSON.stringify({ pinIds: next.map((item) => item.id) }),
    });
    const body = (await response.json()) as ApiResponse;
    if (body.ok && body.items) setItems(body.items);
  }

  if (!items.length) {
    return (
      <EmptyState title="No pinned achievements">
        Pin achievements from any game page to build your hunting checklist.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-5">
      {toast ? (
        <div
          role="status"
          className="rounded-md border border-cyan-300/40 bg-cyan-300/10 p-3 text-sm text-cyan-100"
        >
          {toast}
        </div>
      ) : null}

      {groups.map((group) => (
        <section key={group.game.id} className="space-y-3">
          <div className="flex items-center gap-3">
            <Image
              src={
                group.game.capsuleImageUrl ??
                group.game.headerImageUrl ??
                "/ac-placeholder.svg"
              }
              alt=""
              width={80}
              height={48}
              className="h-12 w-20 rounded object-cover"
            />
            <div>
              <h2 className="font-semibold text-white">{group.game.name}</h2>
              <p className="text-sm text-slate-400">
                {group.items.length} pinned achievement
                {group.items.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            {group.items.map((item) => {
              const index = items.findIndex(
                (candidate) => candidate.id === item.id,
              );
              return (
                <PlannerCard
                  key={item.id}
                  item={item}
                  disabled={isPending}
                  onPatch={(patch) =>
                    startTransition(() => patchPin(item.id, patch))
                  }
                  onRemove={() => startTransition(() => removePin(item.id))}
                  onMoveUp={() => startTransition(() => move(index, -1))}
                  onMoveDown={() => startTransition(() => move(index, 1))}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function PlannerCard({
  item,
  disabled,
  onPatch,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  item: PlannerItem;
  disabled: boolean;
  onPatch: (patch: Partial<PlannerItem>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [notes, setNotes] = useState(item.notes);
  const [progress, setProgress] = useState(item.manualProgressText);

  return (
    <Card>
      <CardContent className="grid gap-4 p-4 lg:grid-cols-[72px_1fr_280px]">
        <Image
          src={
            item.achievement.lockedIconUrl ??
            item.achievement.unlockedIconUrl ??
            "/ac-placeholder.svg"
          }
          alt=""
          width={64}
          height={64}
          className="h-16 w-16 rounded-md object-cover"
        />
        <div className="min-w-0 space-y-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-white">
                {item.achievement.displayName}
              </h3>
              <Badge>{item.achievement.rarity}</Badge>
              <Badge>{item.priority}</Badge>
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              {item.achievement.description ??
                "No description provided by Steam."}
            </p>
          </div>
          <label className="block">
            <span className="text-sm font-medium text-slate-300">Notes</span>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Personal plan, route, or reminder"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-300">
              Manual progress
            </span>
            <Input
              value={progress}
              onChange={(event) => setProgress(event.target.value)}
              placeholder="Example: 2 of 5 collectibles"
            />
          </label>
        </div>
        <div className="flex flex-col gap-3">
          <Select
            aria-label={`Priority for ${item.achievement.displayName}`}
            value={item.priority}
            disabled={disabled}
            onChange={(event) =>
              onPatch({ priority: event.target.value as PinPriority })
            }
          >
            <option value="low">Low priority</option>
            <option value="medium">Medium priority</option>
            <option value="high">High priority</option>
          </Select>
          <Select
            aria-label={`State for ${item.achievement.displayName}`}
            value={item.state}
            disabled={disabled}
            onChange={(event) =>
              onPatch({ state: event.target.value as PinState })
            }
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </Select>
          <Button
            type="button"
            disabled={disabled}
            onClick={() => onPatch({ notes, manualProgressText: progress })}
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            Save
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={disabled}
              onClick={onMoveUp}
            >
              <ArrowUp className="h-4 w-4" aria-hidden="true" />
              Up
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={disabled}
              onClick={onMoveDown}
            >
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
              Down
            </Button>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={disabled}
            onClick={() => onPatch({ state: "completed" })}
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Complete
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={disabled}
            onClick={onRemove}
          >
            <Archive className="h-4 w-4" aria-hidden="true" />
            Archive
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={disabled}
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function groupByGame(items: PlannerItem[]) {
  const groups = new Map<
    string,
    { game: PlannerItem["game"]; items: PlannerItem[] }
  >();
  for (const item of items) {
    const group = groups.get(item.game.id) ?? { game: item.game, items: [] };
    group.items.push(item);
    groups.set(item.game.id, group);
  }
  return Array.from(groups.values());
}
