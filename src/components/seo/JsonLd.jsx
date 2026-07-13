/**
 * Renders a JSON-LD structured-data <script>. Server component.
 * `data` is a plain object (or an array); it is serialized with JSON.stringify.
 */
export default function JsonLd({ data }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
