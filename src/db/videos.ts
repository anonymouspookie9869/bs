import { desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { videos, type VideoRow } from './schema.ts';

export interface CreatePublishedVideoInput {
  title: string;
  genre: string;
  role: string;
  duration: string;
  year: string;
  summary: string;
  videoUrl: string;
  posterUrl: string | null;
  mimeType: string;
  artworkTheme: string;
  featured: boolean;
}

export async function listPublishedVideos(): Promise<VideoRow[]> {
  try {
    return await db
      .select()
      .from(videos)
      .orderBy(desc(videos.featured), desc(videos.createdAt));
  } catch (error) {
    console.error('Database query failed in listPublishedVideos:', error);
    throw new Error('Could not load published showreel videos right now.', {
      cause: error,
    });
  }
}

export async function createPublishedVideo(
  input: CreatePublishedVideoInput,
): Promise<VideoRow> {
  try {
    const result = await db
      .insert(videos)
      .values({
        title: input.title,
        genre: input.genre,
        role: input.role,
        duration: input.duration,
        year: input.year,
        summary: input.summary,
        videoUrl: input.videoUrl,
        posterUrl: input.posterUrl,
        mimeType: input.mimeType,
        artworkTheme: input.artworkTheme,
        featured: input.featured,
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in createPublishedVideo:', error);
    throw new Error('Could not publish video right now. Please try again shortly.', {
      cause: error,
    });
  }
}

export async function updatePublishedVideoFeatured(
  id: number,
  featured: boolean,
): Promise<VideoRow | null> {
  try {
    const result = await db
      .update(videos)
      .set({ featured })
      .where(eq(videos.id, id))
      .returning();

    return result[0] ?? null;
  } catch (error) {
    console.error('Database query failed in updatePublishedVideoFeatured:', error);
    throw new Error('Could not update video status right now. Please try again shortly.', {
      cause: error,
    });
  }
}

export async function deletePublishedVideo(id: number): Promise<boolean> {
  try {
    const result = await db
      .delete(videos)
      .where(eq(videos.id, id))
      .returning({ id: videos.id });

    return result.length > 0;
  } catch (error) {
    console.error('Database query failed in deletePublishedVideo:', error);
    throw new Error('Could not delete video right now. Please try again shortly.', {
      cause: error,
    });
  }
}
