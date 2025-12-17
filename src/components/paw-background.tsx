/**
 * Decorative paw print background pattern component
 * Adds subtle animated paw prints to sections
 */
export default function PawBackground() {
  return (
    <div 
      className="absolute inset-0 paw-pattern pointer-events-none"
      aria-hidden="true"
    />
  );
}