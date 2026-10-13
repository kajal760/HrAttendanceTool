"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { RequestRecipient } from "@/types/employee";
import styles from "./MentionRecipientPicker.module.css";

interface MentionRecipientPickerProps {
  options: RequestRecipient[];
  value: RequestRecipient[];
  onChange: (next: RequestRecipient[]) => void;
}

// A lightweight "@mention" picker: type "@" then a name to search HR, CFO,
// or any colleague, and pick them from the dropdown. Selected people show
// as removable chips above the field.
export default function MentionRecipientPicker({
  options,
  value,
  onChange,
}: MentionRecipientPickerProps) {
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const blurTimeout = useRef<number | undefined>(undefined);

  const query = useMemo(() => {
    const at = inputValue.lastIndexOf("@");
    return at === -1 ? null : inputValue.slice(at + 1).toLowerCase();
  }, [inputValue]);

  const selectedIds = useMemo(() => new Set(value.map((r) => r.id)), [value]);

  const filtered = useMemo(() => {
    if (query === null) return [];
    return options
      .filter((o) => !selectedIds.has(o.id))
      .filter((o) => o.label.toLowerCase().includes(query))
      .slice(0, 6);
  }, [options, query, selectedIds]);

  function selectOption(option: RequestRecipient) {
    onChange([...value, option]);
    setInputValue("");
    setShowDropdown(false);
    setActiveIndex(0);
  }

  function removeRecipient(id: string) {
    onChange(value.filter((r) => r.id !== id));
  }

  function handleInputChange(next: string) {
    setInputValue(next);
    const at = next.lastIndexOf("@");
    setShowDropdown(at !== -1);
    setActiveIndex(0);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (showDropdown && filtered.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % filtered.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        selectOption(filtered[activeIndex]);
        return;
      }
      if (e.key === "Escape") {
        setShowDropdown(false);
        return;
      }
    }
    if (e.key === "Backspace" && inputValue === "" && value.length > 0) {
      removeRecipient(value[value.length - 1].id);
    }
  }

  return (
    <div className={styles.wrap}>
      {value.length > 0 && (
        <div className={styles.chips}>
          {value.map((r) => (
            <span className={styles.chip} key={r.id}>
              @{r.label}
              <button
                type="button"
                className={styles.chipRemove}
                onClick={() => removeRecipient(r.id)}
                aria-label={`Remove ${r.label}`}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        className={styles.input}
        value={inputValue}
        placeholder="Type @ to mention HR, CFO, or a colleague..."
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          window.clearTimeout(blurTimeout.current);
          if (inputValue.includes("@")) setShowDropdown(true);
        }}
        onBlur={() => {
          // Delay so a mousedown on an option can register before we close.
          blurTimeout.current = window.setTimeout(() => setShowDropdown(false), 120);
        }}
        aria-label="Recipients"
      />
      {showDropdown && query !== null && (
        <div className={styles.dropdown}>
          {filtered.length === 0 ? (
            <div className={styles.empty}>No matches</div>
          ) : (
            filtered.map((option, i) => (
              <button
                type="button"
                key={option.id}
                className={`${styles.option} ${i === activeIndex ? styles["option-active"] : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectOption(option);
                }}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <span className={styles.optionLabel}>{option.label}</span>
                <span className={styles.optionEmail}>{option.email}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
