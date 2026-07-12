"use client";

import React, {
  createContext,
  memo,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { BrainIcon, ChevronDownIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const ANIMATION_DURATION = 200;

const ReasoningPreviewContext = createContext(false);

const reasoningVariants = cva("aui-reasoning-root mb-4 w-full", {
  variants: {
    variant: {
      outline: "rounded-lg border px-3 py-2",
      ghost: "",
      muted: "bg-muted/50 rounded-lg px-3 py-2",
    },
  },
  defaultVariants: {
    variant: "outline",
  },
});

export type ReasoningRootProps = Omit<
  React.ComponentProps<typeof Collapsible>,
  "open" | "onOpenChange"
> &
  VariantProps<typeof reasoningVariants> & {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    defaultOpen?: boolean;
    /**
     * Whether the reasoning is currently streaming. When provided, it
     * supersedes `defaultOpen`: the disclosure auto-opens while streaming
     * with a bottom-pinned live preview, auto-collapses when streaming
     * ends, and the first manual toggle takes over permanently.
     */
    streaming?: boolean;
  };

function useScrollLock(
  ref: React.RefObject<HTMLElement | null>,
  duration: number
) {
  return useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const scrollParent = el.closest("[data-radix-scroll-area-viewport]") ?? el.closest(".overflow-y-auto") ?? window;
    if (scrollParent instanceof Window) return;
    const htmlEl = scrollParent as HTMLElement;
    const prev = htmlEl.style.overflow;
    htmlEl.style.overflow = "hidden";
    setTimeout(() => {
      htmlEl.style.overflow = prev;
    }, duration);
  }, [ref, duration]);
}

export function ReasoningRoot({
  className,
  variant,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultOpen = false,
  streaming,
  children,
  ...props
}: ReasoningRootProps) {
  const collapsibleRef = useRef<HTMLDivElement>(null);
  const initialOpenRef = useRef(defaultOpen);
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const lockScroll = useScrollLock(collapsibleRef, ANIMATION_DURATION);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled
    ? controlledOpen!
    : (userOpen ?? streaming ?? initialOpenRef.current);
  const isAutoMode = isControlled || userOpen === null;
  const isPreview = streaming === true && isOpen && isAutoMode;

  const prevStreamingRef = useRef(streaming);
  useLayoutEffect(() => {
    if (prevStreamingRef.current === streaming) return;
    prevStreamingRef.current = streaming;
    if (!isControlled && userOpen === null) lockScroll();
  }, [streaming, isControlled, userOpen, lockScroll]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      lockScroll();
      if (!isControlled) {
        setUserOpen(open);
      }
      controlledOnOpenChange?.(open);
    },
    [lockScroll, isControlled, controlledOnOpenChange]
  );

  return (
    <Collapsible
      ref={collapsibleRef}
      data-slot="reasoning-root"
      data-variant={variant}
      open={isOpen}
      onOpenChange={handleOpenChange}
      className={cn(
        "group/reasoning-root",
        reasoningVariants({ variant, className })
      )}
      style={
        {
          "--animation-duration": `${ANIMATION_DURATION}ms`,
        } as React.CSSProperties
      }
      {...props}
    >
      <ReasoningPreviewContext.Provider value={isPreview}>
        {children}
      </ReasoningPreviewContext.Provider>
    </Collapsible>
  );
}

export type ReasoningTriggerProps = React.ComponentProps<typeof CollapsibleTrigger> & {
  active?: boolean;
};

export const ReasoningTrigger = memo(function ReasoningTrigger({
  className,
  children,
  active,
  ...props
}: ReasoningTriggerProps) {
  return (
    <CollapsibleTrigger
      data-slot="reasoning-trigger"
      className={cn(
        "group/trigger aui-reasoning-trigger text-muted-foreground hover:text-foreground",
        "flex max-w-[75%] origin-left items-center gap-2 py-1.5 text-sm",
        "transition-[color,scale] active:scale-[0.98]",
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          <BrainIcon
            className="aui-reasoning-trigger-icon size-4 shrink-0"
            aria-hidden="true"
            data-slot="reasoning-trigger-icon"
          />
          <span
            data-slot="reasoning-trigger-label"
            className="aui-reasoning-trigger-label-wrapper relative inline-block leading-none tabular-nums"
          >
            {active ? (
              <span className="animate-pulse">Thinking...</span>
            ) : (
              <span>Reasoning</span>
            )}
          </span>
          <ChevronDownIcon
            className={cn(
              "aui-reasoning-trigger-chevron mt-0.5 size-4 shrink-0",
              "transition-transform duration-[--animation-duration] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
              "-rotate-90 group-data-[state=open]/trigger:rotate-0"
            )}
            aria-hidden="true"
            data-slot="reasoning-trigger-chevron"
          />
        </>
      )}
    </CollapsibleTrigger>
  );
});

export type ReasoningContentProps = React.ComponentProps<typeof CollapsibleContent>;

export function ReasoningContent({ className, children, ...props }: ReasoningContentProps) {
  const isPreview = useContext(ReasoningPreviewContext);

  return (
    <CollapsibleContent
      data-slot="reasoning-content"
      className={cn(
        "aui-reasoning-content overflow-hidden",
        "data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
        isPreview && "relative",
        className
      )}
      {...props}
    >
      <div
        data-slot="reasoning-content-inner"
        className={cn(
          "aui-reasoning-content-inner border-l-2 border-indigo-400/30 pl-3 mt-2",
          isPreview && "pb-6"
        )}
      >
        {children}
      </div>
      {isPreview && (
        <div
          data-slot="reasoning-fade"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-background to-transparent"
        />
      )}
    </CollapsibleContent>
  );
}

export type ReasoningTextProps = React.ComponentProps<"p">;

export function ReasoningText({ className, children, ...props }: ReasoningTextProps) {
  return (
    <p
      data-slot="reasoning-text"
      className={cn(
        "aui-reasoning-text text-muted-foreground/70 text-xs leading-relaxed whitespace-pre-wrap font-mono",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}
