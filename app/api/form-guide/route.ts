import { NextResponse } from "next/server";
import { formGuideVideos } from "@/lib/form-guide";

export async function GET(request: Request) {
  const exercise = new URL(request.url).searchParams.get("exercise")?.trim().toLowerCase();
  if (!exercise || exercise.length > 100) {
    return NextResponse.json({ error: "Provide an exercise name up to 100 characters." }, { status: 400 });
  }

  const videoId = formGuideVideos[exercise];
  if (!videoId) {
    return NextResponse.json({ error: "No form video is available for this exercise." }, { status: 404 });
  }

  return NextResponse.json({ videoId });
}
