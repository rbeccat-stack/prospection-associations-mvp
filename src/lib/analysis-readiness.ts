import type { CollectedPage } from "./collector";
import { directorySirenFromUrl } from "./discovery";
import type { TestInput } from "./schemas";

export function associationSourceRequired(input: TestInput, pages: CollectedPage[]): boolean {
  if (!input.url || !directorySirenFromUrl(input.url)) return false;
  return !pages.some(page => {
    if (page.source.origin !== "public_page" || page.source.accessStatus !== "available" || !page.source.url) return false;
    return !directorySirenFromUrl(page.source.url);
  });
}
