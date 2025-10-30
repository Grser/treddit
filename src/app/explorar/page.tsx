import Navbar from "@/components/Navbar";
import PageHero from "@/components/PageHero";

export default function ExplorePage() {
  return (
    <div className="min-h-dvh">
      <Navbar />
      <PageHero page="explore" />
    </div>
  );
}
