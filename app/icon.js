import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Dynamically generated favicon: brand-gradient rounded square with an "L".
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #4f46e5, #0ea5e9)",
          color: "white",
          fontSize: 22,
          fontWeight: 700,
          borderRadius: 7,
        }}
      >
        L
      </div>
    ),
    { ...size }
  );
}
