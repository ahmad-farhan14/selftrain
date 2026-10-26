import { NextResponse } from "next/server";

type YouTubeSearchResponse = {
  items?: { id?: { videoId?: unknown } }[];
  error?: { message?: string };
};

export async function GET(request: Request) {
  const exercise = new URL(request.url).searchParams.get("exercise")?.trim();
  if (!exercise || exercise.length > 100) {
    return NextResponse.json({ error: "Provide an exercise name up to 100 characters." }, { status: 400 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Embedded videos are not configured. Set YOUTUBE_API_KEY on the server." }, { status: 503 });
  }

  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("maxResults", "1");
  searchUrl.searchParams.set("safeSearch", "strict");
  searchUrl.searchParams.set("q", `${exercise} proper form exercise demonstration`);
  searchUrl.searchParams.set("key", apiKey);

  try {
    const response = await fetch(searchUrl, { cache: "no-store" });
    const result = await response.json() as YouTubeSearchResponse;
    if (!response.ok) {
      console.error("YouTube form-guide search failed.", response.status, result.error?.message);
      return NextResponse.json({ error: "YouTube could not find a form video. Try again later." }, { status: 502 });
    }

    const videoId = result.items?.[0]?.id?.videoId;
    if (typeof videoId !== "string" || !/^[\w-]{11}$/.test(videoId)) {
      return NextResponse.json({ error: "No form video was found for this exercise." }, { status: 404 });
    }

    return NextResponse.json({ videoId });
  } catch (error) {
    console.error("Could not reach the YouTube form-guide search.", error);
    return NextResponse.json({ error: "Could not load a form video. Check your connection and try again." }, { status: 502 });
  }
}
