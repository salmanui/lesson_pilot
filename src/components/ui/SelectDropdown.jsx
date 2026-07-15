"use client";

import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { HiCheck, HiChevronUpDown } from "react-icons/hi2";

/**
 * Accessible select built on the Headless UI Listbox.
 *
 * options: [{ value, label, description? }]
 * Keyboard navigation, focus management and the portalled popover come from
 * Headless UI; everything here is presentation.
 */
export default function SelectDropdown({
  value,
  onChange,
  options = [],
  placeholder = "Select an option",
  ariaLabel,
  invalid = false,
}) {
  const selected = options.find((option) => option.value === value) || null;

  return (
    <Listbox value={value} onChange={onChange}>
      <div className="relative">
        <ListboxButton
          aria-label={ariaLabel}
          className={`group flex w-full items-center justify-between gap-2 rounded-xl border bg-white/80 px-3.5 py-2.5 text-left text-sm shadow-sm transition focus:outline-none focus:ring-4 data-[open]:border-indigo-400 data-[open]:bg-white data-[open]:ring-4 data-[open]:ring-indigo-500/15 ${
            invalid
              ? "border-red-300 focus:border-red-400 focus:ring-red-500/15"
              : "border-gray-200 hover:border-indigo-300 focus:border-indigo-400 focus:ring-indigo-500/15"
          }`}
        >
          <span
            className={`truncate ${
              selected ? "font-medium text-gray-900" : "text-gray-400"
            }`}
          >
            {selected ? selected.label : placeholder}
          </span>
          <HiChevronUpDown className="h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 group-data-[open]:rotate-180" />
        </ListboxButton>

        <ListboxOptions
          anchor={{ to: "bottom start", gap: 8 }}
          transition
          className="z-50 w-[var(--button-width)] origin-top overflow-y-auto rounded-2xl border border-indigo-100 bg-white p-1.5 shadow-xl shadow-indigo-900/10 [--anchor-max-height:17rem] focus:outline-none transition duration-150 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
        >
          {options.map((option) => (
            <ListboxOption
              key={option.value}
              value={option.value}
              className={({ focus, selected: isSelected }) =>
                `flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition ${
                  isSelected
                    ? "bg-gradient-to-r from-indigo-50 to-sky-50 ring-1 ring-indigo-200"
                    : focus
                    ? "bg-indigo-50"
                    : ""
                }`
              }
            >
              {({ selected: isSelected }) => (
                <>
                  <span className="min-w-0">
                    <span
                      className={`block truncate text-sm font-semibold ${
                        isSelected ? "text-indigo-700" : "text-slate-800"
                      }`}
                    >
                      {option.label}
                    </span>
                    {option.description && (
                      <span className="mt-0.5 block truncate text-xs text-slate-500">
                        {option.description}
                      </span>
                    )}
                  </span>
                  {isSelected && (
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
                      <HiCheck className="h-3.5 w-3.5" />
                    </span>
                  )}
                </>
              )}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
