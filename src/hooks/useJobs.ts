import { mockJobs } from "../lib/mockData";
import { useJobStore } from "../store/useJobStore";

export function useJobs() {
  const { filters } = useJobStore();
  const jobs = mockJobs
    .filter((job) => {
      const search = `${job.title} ${job.description} ${job.platform}`.toLowerCase();
      return (
        search.includes(filters.search.toLowerCase()) &&
        (filters.category === "All" || job.category === filters.category) &&
        (filters.platform === "All" || job.platform === filters.platform) &&
        (filters.payment === "All" || job.currency === filters.payment) &&
        job.price >= filters.minPrice &&
        job.price <= filters.maxPrice
      );
    })
    .sort((a, b) => {
      if (filters.sort === "highest pay") return b.price - a.price;
      if (filters.sort === "ending soon") return new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime();
      if (filters.sort === "most popular") return b.popularity - a.popularity;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return { jobs, filters };
}
