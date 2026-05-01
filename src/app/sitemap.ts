import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const examEvents = await prisma.examEvent.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  const examEventUrls: MetadataRoute.Sitemap = examEvents.map((event) => ({
    url: `https://mockzy.co.in/exam-events/${event.slug}`,
    lastModified: event.updatedAt,
    changeFrequency: "hourly",
    priority: 0.95,
  }));

  return [
    {
      url: "https://mockzy.co.in",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://mockzy.co.in/exams",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: "https://mockzy.co.in/exam-events",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: "https://mockzy.co.in/study-materials",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: "https://mockzy.co.in/login",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...examEventUrls,
  ];
}