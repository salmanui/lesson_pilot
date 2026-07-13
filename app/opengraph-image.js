import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Dynamically generated social-share (Open Graph / Twitter) image.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background:
            "linear-gradient(135deg, #4338ca 0%, #2563eb 50%, #0ea5e9 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "44px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "84px",
              height: "84px",
              borderRadius: "20px",
              background: "rgba(255,255,255,0.16)",
              fontSize: "46px",
              fontWeight: 800,
            }}
          >
            L
          </div>
          <div style={{ display: "flex", fontSize: "46px", fontWeight: 700 }}>
            {SITE_NAME}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: "68px",
            fontWeight: 800,
            lineHeight: 1.1,
            maxWidth: "920px",
          }}
        >
          Plan lessons & generate tests in minutes, not hours.
        </div>

        <div
          style={{
            display: "flex",
            marginTop: "34px",
            fontSize: "30px",
            opacity: 0.85,
          }}
        >
          {SITE_TAGLINE}
        </div>
      </div>
    ),
    { ...size }
  );
}
