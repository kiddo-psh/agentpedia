import type { Person } from "@/content/schema";

/** Photo only when a licensed image is registered; its credit is always shown with it. */
export function PersonCard({ person }: { person: Person }) {
  const { photo } = person;
  return (
    <figure className="flex items-center gap-3">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote licensed image, shown as-is with credit
        <img src={photo.url} alt={person.nameKo} className="size-12 shrink-0 rounded-full object-cover" />
      ) : (
        <span
          aria-hidden
          className="grid size-12 shrink-0 place-items-center rounded-full bg-accent/10 text-lg font-semibold text-accent"
        >
          {person.nameKo.slice(0, 1)}
        </span>
      )}
      <figcaption className="min-w-0">
        <p className="font-semibold leading-tight">
          {person.nameKo} <span className="text-sm font-normal text-muted">{person.name}</span>
        </p>
        <p className="text-sm text-muted">{person.role}</p>
        {photo && (
          <p className="mt-0.5 text-[0.7rem] text-muted">
            사진:{" "}
            <a href={photo.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              {photo.credit}
            </a>{" "}
            · {photo.license}
          </p>
        )}
      </figcaption>
    </figure>
  );
}
