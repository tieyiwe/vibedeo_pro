import Link from "next/link";
import { CreditIcon, GridIcon, SpinnerIcon, UsersIcon } from "./Icons";

/** Studio-overview tiles at the top of the library. */
export function StatTiles({
  credits,
  plan,
  totalVideos,
  processing,
  characters,
}: {
  credits: number;
  plan: string;
  totalVideos: number;
  processing: number;
  characters: number;
}) {
  const tiles = [
    {
      label: "Credits remaining",
      value: credits.toLocaleString(),
      hint: `${plan} plan`,
      icon: <CreditIcon className="h-4 w-4 text-brand-300" />,
      href: "/pricing",
    },
    {
      label: "Total videos",
      value: totalVideos.toLocaleString(),
      hint: "generated all-time",
      icon: <GridIcon className="h-4 w-4 text-zinc-500" />,
      href: null,
    },
    {
      label: "Processing",
      value: processing.toLocaleString(),
      hint: processing > 0 ? "currently rendering" : "nothing in the queue",
      icon:
        processing > 0 ? (
          <SpinnerIcon className="h-4 w-4 text-brand-300" />
        ) : (
          <SpinnerIcon className="h-4 w-4 text-zinc-600" />
        ),
      href: null,
    },
    {
      label: "Characters",
      value: characters.toLocaleString(),
      hint: "reusable cast",
      icon: <UsersIcon className="h-4 w-4 text-zinc-500" />,
      href: "/characters",
    },
  ];

  return (
    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map((tile) => {
        const body = (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">{tile.label}</span>
              {tile.icon}
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50 tabular-nums">
              {tile.value}
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-600">{tile.hint}</p>
          </>
        );

        return tile.href ? (
          <Link
            key={tile.label}
            href={tile.href}
            className="card p-4 transition hover:border-brand-500/50"
          >
            {body}
          </Link>
        ) : (
          <div key={tile.label} className="card p-4">
            {body}
          </div>
        );
      })}
    </div>
  );
}
