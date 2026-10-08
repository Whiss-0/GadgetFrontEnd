// Smooth scrolling that respects the OS reduced-motion setting.
// Native `scroll-behavior` is covered in CSS, but scrollIntoView({ behavior })
// from JS ignores it, so every call goes through here.
function prefersReducedMotion() {
  return typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

export function scrollToElement(element) {
  if (!element) return;
  element.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
}

export function scrollToId(id) {
  scrollToElement(document.getElementById(id));
}
