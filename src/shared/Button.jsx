// Placeholder. Syakir designs this in task S1. Tap target is at least 44px tall.
export default function Button({ children, ...props }) {
  return (
    <button
      type="button"
      className="min-h-11 rounded-lg bg-teal-700 px-4 font-medium text-white disabled:opacity-50"
      {...props}
    >
      {children}
    </button>
  );
}
