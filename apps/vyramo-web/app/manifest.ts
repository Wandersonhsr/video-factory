import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vyramo AI",
    short_name: "Vyramo",
    description: "AI Video Engine — Find. Remodel. Sell.",
    start_url: "/",
    display: "standalone",
    background_color: "#090713",
    theme_color: "#090713",
  };
}
