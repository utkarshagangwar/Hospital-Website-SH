'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';

const VIEWPORT_MARGIN = 8;
const PANEL_OFFSET = 6;

// Positions a portaled popover against its trigger with a `position: fixed`
// style computed from real bounding rects, flipping above/right when there
// isn't room below/left. Every "self-drawn" dropdown in this app (select,
// date picker, time picker) used to render its panel as a plain absolutely-
// positioned child of the trigger, which two things reliably broke: a fixed
// panel width running past the viewport edge, and any ancestor with
// `overflow: hidden` (e.g. the admin dashboard's card panels) clipping the
// panel outright. Rendering through a portal with a measured fixed position
// fixes both at once, for every consumer, instead of nudging one instance.
export function useFloatingPosition(isOpen, triggerRef, panelRef, { matchTriggerWidth = false, maxPanelHeight } = {}) {
    const [style, setStyle] = useState(null);

    // Callers (e.g. CustomSelect) legitimately pass a fresh options object —
    // and for maxPanelHeight, a fresh function — on every render. Reading
    // those through a ref instead of a useCallback dependency keeps
    // `recalculate`'s identity stable across renders; putting them in the
    // dependency array instead made the layout effect below re-run every
    // render (new recalculate -> effect re-fires -> setStyle -> re-render ->
    // new recalculate -> ...), which is an infinite update-depth loop, not
    // just a wasted render.
    const optionsRef = useRef({ matchTriggerWidth, maxPanelHeight });
    optionsRef.current = { matchTriggerWidth, maxPanelHeight };

    const recalculate = useCallback(() => {
        const trigger = triggerRef.current;
        if (!trigger) return;
        const panel = panelRef.current;
        const { matchTriggerWidth: matchWidth, maxPanelHeight: maxHeightOption } = optionsRef.current;

        const triggerRect = trigger.getBoundingClientRect();
        const panelWidth = panel?.offsetWidth || triggerRect.width;
        const panelHeight = panel?.offsetHeight || 0;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Horizontal: left-align with the trigger by default, flip to
        // right-aligned if that would run past the viewport's right edge,
        // then clamp so it never runs past either edge.
        let left = triggerRect.left;
        if (left + panelWidth > viewportWidth - VIEWPORT_MARGIN) {
            left = triggerRect.right - panelWidth;
        }
        left = Math.max(VIEWPORT_MARGIN, Math.min(left, viewportWidth - panelWidth - VIEWPORT_MARGIN));

        // Vertical: open below by default, flip above when there's not
        // enough room below but more room above.
        const spaceBelow = viewportHeight - triggerRect.bottom;
        const spaceAbove = triggerRect.top;
        const openUpward = panelHeight > 0 && spaceBelow < panelHeight + VIEWPORT_MARGIN && spaceAbove > spaceBelow;
        const top = openUpward
            ? Math.max(VIEWPORT_MARGIN, triggerRect.top - panelHeight - PANEL_OFFSET)
            : triggerRect.bottom + PANEL_OFFSET;

        // The available-space cap is a safety net (keeps the panel from
        // running off-screen on a short viewport); maxPanelHeight is a
        // deliberate design cap some consumers want regardless of how much
        // space happens to be available (e.g. CustomSelect's option list
        // stays scrollable past 260px even on a tall screen). Whichever is
        // smaller wins. A function (not just a number) lets that design cap
        // itself vary by viewport width, since this recalculates on resize.
        const resolvedMaxPanelHeight = typeof maxHeightOption === 'function' ? maxHeightOption(viewportWidth) : maxHeightOption;
        const availableSpace = openUpward ? triggerRect.top - VIEWPORT_MARGIN * 2 : viewportHeight - top - VIEWPORT_MARGIN;
        const cappedHeight = resolvedMaxPanelHeight ? Math.min(availableSpace, resolvedMaxPanelHeight) : availableSpace;

        setStyle((prev) => {
            const next = {
                position: 'fixed',
                top,
                left,
                width: matchWidth ? triggerRect.width : undefined,
                maxHeight: cappedHeight,
                overflowY: 'auto',
            };
            // Bail out on an identical result so a resize/scroll tick that
            // didn't actually move anything doesn't still force a re-render.
            if (prev && prev.top === next.top && prev.left === next.left && prev.width === next.width && prev.maxHeight === next.maxHeight) {
                return prev;
            }
            return next;
        });
    }, [triggerRef, panelRef]);

    useLayoutEffect(() => {
        if (!isOpen) {
            setStyle(null);
            return;
        }
        // Runs after the panel has committed to the DOM (via the portal) but
        // before paint, so measuring it here and re-setting state still
        // resolves in the same frame — no visible jump.
        recalculate();
        window.addEventListener('resize', recalculate);
        window.addEventListener('scroll', recalculate, true);
        return () => {
            window.removeEventListener('resize', recalculate);
            window.removeEventListener('scroll', recalculate, true);
        };
    }, [isOpen, recalculate]);

    return style;
}
