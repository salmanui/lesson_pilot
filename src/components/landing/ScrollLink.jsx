"use client";

/**
 * Smoothly scrolls to a section by id WITHOUT adding a #hash to the URL.
 * `scroll-margin-top` on the target section keeps it clear of the sticky nav.
 */
export default function ScrollLink({ to, children, className, onNavigate }) {
  const handleClick = (event) => {
    event.preventDefault();
    const target = document.getElementById(to);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    onNavigate?.();
  };

  return (
    <a href={`#${to}`} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
