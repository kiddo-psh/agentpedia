declare module "subset-font" {
  export default function subsetFont(
    buffer: Buffer,
    text: string,
    options?: { targetFormat?: "woff2" | "woff" | "truetype" },
  ): Promise<Buffer>;
}
