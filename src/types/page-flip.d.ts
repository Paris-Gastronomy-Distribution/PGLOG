/**
 * Déclarations minimales pour `page-flip` (StPageFlip 2.0.7), qui ne publie
 * pas ses types. Seule la partie de l'API utilisée par le viewer est décrite.
 */
declare module "page-flip" {
  export type SizeType = "fixed" | "stretch";
  export type Orientation = "portrait" | "landscape";
  export type FlippingState = "user_fold" | "fold_corner" | "flipping" | "read";
  export type FlipCorner = "top" | "bottom";

  export interface FlipSetting {
    startPage: number;
    size: SizeType;
    width: number;
    height: number;
    minWidth: number;
    maxWidth: number;
    minHeight: number;
    maxHeight: number;
    drawShadow: boolean;
    flippingTime: number;
    usePortrait: boolean;
    startZIndex: number;
    autoSize: boolean;
    maxShadowOpacity: number;
    showCover: boolean;
    mobileScrollSupport: boolean;
    clickEventForward: boolean;
    useMouseEvents: boolean;
    swipeDistance: number;
    showPageCorners: boolean;
    disableFlipByClick: boolean;
  }

  export interface PageFlipEvent<T> {
    data: T;
    object: PageFlip;
  }

  export interface PageRect {
    left: number;
    top: number;
    width: number;
    height: number;
    pageWidth: number;
  }

  export interface Render {
    getRect(): PageRect;
    getOrientation(): Orientation;
    /** 0 = vers l'avant, 1 = vers l'arrière. */
    getDirection(): number;
  }

  export interface UI {
    getDistElement(): HTMLElement;
  }

  export class PageFlip {
    constructor(element: HTMLElement, setting: Partial<FlipSetting>);
    loadFromHTML(items: HTMLElement[] | NodeListOf<HTMLElement>): void;
    update(): void;
    destroy(): void;
    flipNext(corner?: FlipCorner): void;
    flipPrev(corner?: FlipCorner): void;
    flip(page: number, corner?: FlipCorner): void;
    turnToPage(page: number): void;
    getCurrentPageIndex(): number;
    getPageCount(): number;
    getOrientation(): Orientation;
    getState(): FlippingState;
    getSettings(): FlipSetting;
    getRender(): Render;
    getUI(): UI;
    on(event: "flip", cb: (e: PageFlipEvent<number>) => void): PageFlip;
    on(event: "changeState", cb: (e: PageFlipEvent<FlippingState>) => void): PageFlip;
    on(event: "changeOrientation", cb: (e: PageFlipEvent<Orientation>) => void): PageFlip;
    on(event: "init" | "update", cb: (e: PageFlipEvent<{ page: number; mode: Orientation }>) => void): PageFlip;
    off(event: string): void;
  }
}
