(() => {
  let generation = 0;

  // RGB 转 HSL，用于区分图片里的灰白背景和有色部分。
  function toHsl([r, g, b]) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const difference = max - min;
    const lightness = (max + min) / 2;

    if (difference === 0) {
      return { h: 218, s: 0, l: lightness };
    }

    const saturation =
      difference / (1 - Math.abs(2 * lightness - 1));

    let hue;
    if (max === r) {
      hue = ((g - b) / difference) % 6;
    } else if (max === g) {
      hue = (b - r) / difference + 2;
    } else {
      hue = (r - g) / difference + 4;
    }

    return {
      h: (hue * 60 + 360) % 360,
      s: saturation,
      l: lightness
    };
  }

  function backgroundUrl(element) {
    if (!element) return "";

    const background = getComputedStyle(element).backgroundImage;
    const match = background.match(/url\(["']?(.*?)["']?\)/);

    return match ? match[1] : "";
  }

  function findImage() {
    // 404 页优先从你的自定义插图取色。
    const errorImage = document.querySelector(
      ".type-404 .error-img img"
    );

    if (errorImage) {
      return errorImage.currentSrc || errorImage.src;
    }

    // 首页、文章页优先从页头封面取色，其次使用全站背景。
    return (
      backgroundUrl(document.getElementById("page-header")) ||
      backgroundUrl(document.getElementById("web_bg"))
    );
  }

  function applyColor(nav, hue, saturation) {
    nav.style.setProperty("--brand-h", Math.round(hue));
    nav.style.setProperty(
      "--brand-s",
      `${Math.round(saturation * 100)}%`
    );
  }

  function updateNavColor() {
    const currentGeneration = ++generation;
    const nav = document.getElementById("nav");
    if (!nav) return;

    // 图片加载前、没有图片或取色失败时，使用柔和蓝色。
    applyColor(nav, 218, 0.55);

    const source = findImage();
    if (!source || typeof ColorThief === "undefined") return;

    const image = new Image();
    image.crossOrigin = "anonymous";

    image.onload = () => {
      // 防止快速切换页面后，旧图片覆盖新页面的颜色。
      if (currentGeneration !== generation || !nav.isConnected) {
        return;
      }

      try {
        const palette = new ColorThief().getPalette(image, 8);
        if (!palette || !palette.length) return;

        const candidates = palette
          .map((rgb, index) => ({
            ...toHsl(rgb),
            index
          }))
          // 避免选到灰白底色、接近黑色的线条。
          .filter(color =>
            color.s >= 0.18 &&
            color.l >= 0.18 &&
            color.l <= 0.82
          );

        if (!candidates.length) return;

        // 兼顾调色板排序、饱和度和适中的亮度。
        const score = color =>
          0.55 / (color.index + 1) +
          color.s * 0.35 -
          Math.abs(color.l - 0.5) * 0.25;

        candidates.sort((a, b) => score(b) - score(a));

        const chosen = candidates[0];

        // 保留图片色相，控制饱和度，避免文字过灰或过艳。
        const saturation = Math.min(
          0.65,
          Math.max(0.42, chosen.s)
        );

        applyColor(nav, chosen.h, saturation);
      } catch (error) {
        console.debug("导航取色失败，使用默认蓝色。", error);
      }
    };

    // 加载失败时保留已经设置好的默认色。
    image.onerror = () => {};

    // 先绑定事件，再设置图片地址。
    image.src = source;
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      updateNavColor,
      { once: true }
    );
  } else {
    updateNavColor();
  }

  // 兼容以后开启 PJAX 的情况。
  document.addEventListener("pjax:complete", updateNavColor);
})();