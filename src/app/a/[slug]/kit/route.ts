import { buildKitArchive } from "@/content/kit";
import { getArticle } from "@/content/loader";
import { trackBrowserAfterResponse } from "@/events/track";

export async function GET(request: Request, { params }: RouteContext<"/a/[slug]/kit">) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return new Response("Not found", { status: 404 });

  const articleUrl = new URL(`/a/${slug}`, request.url).toString();
  const zip = buildKitArchive(article, articleUrl);
  const response = new Response(zip as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${slug}-kit.zip"`,
    },
  });
  return trackBrowserAfterResponse(request, { kind: "kit_download", articleSlug: slug }, response);
}
