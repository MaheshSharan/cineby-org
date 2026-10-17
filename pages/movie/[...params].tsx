import type { GetServerSideProps } from "next";
import Head from "next/head";

import type { MovieDetails } from "@/lib/tmdb";
import { getMovieDetails } from "@/lib/tmdb/server";

import { DetailPage } from "@/components/detail/DetailPage";

interface MoviePageProps {
  details: MovieDetails;
  isPlaying: boolean;
}

export default function MoviePage({ details, isPlaying }: MoviePageProps) {
  return (
    <>
      <Head>
        <title>{`${details.title} | Cineby`}</title>
        <meta name="description" content={details.overview} />
      </Head>
      <DetailPage details={details} isPlaying={isPlaying} />
    </>
  );
}

import { extractIdFromSlug } from "@/lib/utils/slug";

export const getServerSideProps: GetServerSideProps<MoviePageProps> = async (context) => {
  const param = context.params?.params?.[0];
  const id = extractIdFromSlug(param);

  if (!id) {
    return { notFound: true };
  }

  try {
    const details = await getMovieDetails(id);

    return {
      props: {
        details,
        isPlaying: context.query.play === "true",
      },
    };
  } catch {
    return { notFound: true };
  }
};