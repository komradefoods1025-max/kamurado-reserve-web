declare module "page-flip" {
  export type PageFlipMode = "portrait" | "landscape";

  export type PageFlipInitEvent = {
    page: number;
    mode: PageFlipMode;
  };

  export type PageFlipEvent = {
    data: number | string | PageFlipInitEvent;
    object: PageFlip;
  };

  export class PageFlip {
    constructor(htmlParent: HTMLElement, setting?: Record<string, unknown>);
    loadFromHtml(items: HTMLElement[] | NodeListOf<HTMLElement>): void;
    loadFromImages(images: string[]): void;
    on(
      event: "flip" | "init" | "changeState" | "changeOrientation" | "update",
      callback: (event: PageFlipEvent) => void,
    ): void;
    flipNext(corner?: "top" | "bottom"): void;
    flipPrev(corner?: "top" | "bottom"): void;
    turnToPage(page: number): void;
    flip(page: number, corner?: "top" | "bottom"): void;
    getPageCount(): number;
    getCurrentPageIndex(): number;
    destroy(): void;
    update(): void;
    updateFromHtml(items: HTMLElement[] | NodeListOf<HTMLElement>): void;
  }
}
