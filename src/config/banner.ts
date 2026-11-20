// Home hero images: one per theme.
// `position` is the CSS background-position that decides which part of the image survives the crop
// (the banner is 2:1 on phones and up to 4.5:1 on wide screens).
export const BANNER_CONFIG = {
  light: {
    src: "/banner/banner-light.webp",
    position: "center 90%",
    credit: { text: "OshinoUomi", url: "https://www.pixiv.net/artworks/107570605" },
  },
  dark: {
    src: "/banner/banner-dark.webp",
    position: "center 80%",
    credit: { text: "OshinoUomi", url: "https://www.pixiv.net/artworks/106922955" },
  },
} as const;
