import Navbar from "@/components/Navbar";
import PageHero from "@/components/PageHero";

export default function PopularPage() {
  return (
    <div className="min-h-dvh">
      <Navbar />
      <PageHero page="popular" />
    </div>
  );
}
