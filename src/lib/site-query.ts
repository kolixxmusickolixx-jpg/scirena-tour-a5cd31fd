import { queryOptions } from "@tanstack/react-query";
import { getSiteData } from "./site.functions";

export const siteQuery = queryOptions({ queryKey: ["site-data"], queryFn: () => getSiteData() });
