export interface Game {
    start(): void;
    stop(): void;
    update(): void;
    draw(ctx: CanvasRenderingContext2D): void;
}
