'use client';

import { useState, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from '@/components/icons';
import { useFloatingPosition } from '@/utils/useFloatingPosition';
import './CustomSelect.css';

// Fully custom listbox — a native <select>'s open option list is rendered by
// the OS, not the page, so it can never be made to match the site's design.
// This replaces it end to end (trigger + panel + keyboard nav) instead of
// dressing up the native control with a fake arrow.
export default function CustomSelect({
    id,
    value,
    onChange,
    options,
    placeholder = 'Select an option',
    disabled = false,
    triggerClassName = '',
    triggerStyle,
    hideIcon = false,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const rootRef = useRef(null);
    const listRef = useRef(null);
    const reactId = useId();
    const triggerId = id || reactId;
    // Anchored to rootRef (not the trigger button) to preserve the previous
    // CSS's sizing: the old `.custom-select-menu { left:0; right:0 }` sized
    // the menu to the wrapping root div, which can be wider than the button
    // itself when a caller shrinks the trigger via `triggerStyle` (e.g. the
    // width:'auto' status-badge dropdowns in the appointments table).
    const floatingStyle = useFloatingPosition(isOpen, rootRef, listRef, {
        matchTriggerWidth: true,
        // Matches the old CSS media query this replaces (480px -> 220px cap).
        maxPanelHeight: (viewportWidth) => (viewportWidth <= 480 ? 220 : 260),
    });

    const selected = options.find((opt) => opt.value === value);

    useEffect(() => {
        if (!isOpen) return;

        // Portaled panel is no longer a DOM descendant of rootRef — must be
        // checked separately, or every click inside it counts as "outside".
        const handleClickOutside = (e) => {
            if (rootRef.current?.contains(e.target)) return;
            if (listRef.current?.contains(e.target)) return;
            setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);

        const selectedIndex = options.findIndex((opt) => opt.value === value);
        setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
        listRef.current?.focus();

        return () => document.removeEventListener('mousedown', handleClickOutside);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const commitSelection = (opt) => {
        if (opt.disabled) return;
        onChange(opt.value);
        setIsOpen(false);
    };

    const moveHighlight = (delta) => {
        setHighlightedIndex((current) => {
            const count = options.length;
            let next = current;
            for (let i = 0; i < count; i++) {
                next = (next + delta + count) % count;
                if (!options[next].disabled) break;
            }
            return next;
        });
    };

    const handleTriggerKeyDown = (e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            setIsOpen(true);
        }
    };

    const handleListKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            setIsOpen(false);
            rootRef.current?.querySelector('.custom-select-trigger')?.focus();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            moveHighlight(1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            moveHighlight(-1);
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const opt = options[highlightedIndex];
            if (opt) commitSelection(opt);
        } else if (e.key === 'Tab') {
            setIsOpen(false);
        }
    };

    return (
        <div className={`custom-select-root${disabled ? ' is-disabled' : ''}`} ref={rootRef}>
            <button
                type="button"
                id={triggerId}
                className={`custom-select-trigger${triggerClassName ? ` ${triggerClassName}` : ''}`}
                style={triggerStyle}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                disabled={disabled}
                onClick={() => setIsOpen((open) => !open)}
                onKeyDown={handleTriggerKeyDown}
            >
                <span className={`custom-select-value${!selected ? ' is-placeholder' : ''}`}>
                    {selected ? selected.label : placeholder}
                </span>
                {!hideIcon && (
                    <ChevronDown size={16} className={`custom-select-icon${isOpen ? ' is-open' : ''}`} />
                )}
            </button>

            {isOpen && typeof document !== 'undefined' && createPortal(
                <ul
                    className="custom-select-menu"
                    role="listbox"
                    ref={listRef}
                    tabIndex={-1}
                    onKeyDown={handleListKeyDown}
                    style={floatingStyle || { visibility: 'hidden', position: 'fixed', top: 0, left: 0 }}
                >
                    {options.map((opt, index) => (
                        <li
                            key={opt.value}
                            role="option"
                            aria-selected={opt.value === value}
                            aria-disabled={opt.disabled || undefined}
                            className={[
                                'custom-select-option',
                                opt.value === value ? 'is-selected' : '',
                                opt.disabled ? 'is-disabled' : '',
                                index === highlightedIndex ? 'is-highlighted' : '',
                            ].filter(Boolean).join(' ')}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            onClick={() => commitSelection(opt)}
                        >
                            {opt.label}
                        </li>
                    ))}
                </ul>,
                document.body
            )}
        </div>
    );
}
